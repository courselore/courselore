# Setting Up for Development

**Welcome!** 👋

Courselore has been designed to be welcoming to new developers. It’s an excellent first project for people who are new to contributing to open-source software.

> **Note:** If you get stuck, please [open an issue](https://github.com/courselore/courselore/issues/new?body=%2A%2AWhat%20did%20you%20try%20to%20do%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20did%20you%20expect%20to%20happen%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20really%20happened%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20error%20messages%20%28if%20any%29%20did%20you%20run%20into%3F%2A%2A%0A%0A%0A%0A%2A%2APlease%20provide%20as%20much%20relevant%20context%20as%20possible%20%28operating%20system%2C%20browser%2C%20and%20so%20forth%29%3A%2A%2A%0A).

> **Note:** Join our community at [Meta Courselore](https://courselore.org/courses/8537410611/invitations/3667859788) to talk to the developers, propose pull requests, get help on what you’re developing, and so forth.

## Running a Pre-Compiled Binary Locally

The best way to get started is to run a pre-compiled Courselore binary on your machine. You may download Courselore from two channels: The latest development versions, which are available as [Actions Artifacts](https://github.com/courselore/courselore/actions); and stable versions, which are available as [Releases](https://github.com/courselore/courselore/releases). After you downloaded Courselore, extract it and run the `courselore` binary.

> **Note:** You must be signed in to GitHub to download GitHub Actions Artifacts.

> **Note:** Courselore uses the following network ports: 80, 443, and 4000. Stop other applications you may have running on those ports. In macOS and Linux, for example, you may find which application is running on a network port by using `lsof -i:80`. Or you may prefer to use [`npx kill-port 80 443 4000`](https://github.com/tiaanduplessis/kill-port).

> **Note:** Most Linux distributions prevent regular users from binding to network ports lower than 1024. This is a setting that [you should disable](https://github.com/small-tech/auto-encrypt/tree/a917892b93b61cd3b80a6f3919db752e2c5a9f6c#a-note-on-linux-and-the-security-farce-that-is-privileged-ports).

> **Note:** Courselore may ask for your password before running. This happens because it runs with HTTPS—not HTTP—in development to reduce confusion around some browser features that work differently under HTTPS. To accomplish this, it needs to install local TLS certificates on your operating system’s trust store. Courselore relies on [Caddy](https://caddyserver.com) to manage this process.

> **Note:** Firefox may have issues with the local TLS certificate used by Courselore because by default it uses its own trust store. There are two possible solutions for this:
>
> 1. Configure Firefox to use the operating system’s trust store by visiting `about:config` and setting `security.enterprise_roots.enabled` to `true`.
>
> 2. Use NSS to install the TLS certificate into Firefox’s trust store.

## Running from Source

<details>
<summary>Windows</summary>

> **Note:** If you’re using Windows Subsystem for Linux (WSL), follow the instructions for Linux instead.

1. Install [Chocolatey](https://chocolatey.org) and the following packages:

   ```console
   > choco install nvm python visualstudio2022-workload-vctools vscode git
   ```

   > **Note:** You must run PowerShell as administrator for Chocolatey to work.

   > **Note:** You may have to close and reopen PowerShell after installing programs such as Chocolatey and NVM for Windows before you’re able to use them.

   > **Note:** Instead of using Chocolatey, you could go to the websites for the development tools and install them by hand, but Chocolatey makes installation and updates more straightforward.

   > **Package Breakdown**
   >
   > - [NVM for Windows (`nvm`)](https://github.com/coreybutler/nvm-windows): A manager of multiple Node.js installations. While in theory you could install just the latest Node.js version directly from Chocolatey, in practice you’ll often need to test something in different versions of Node.js, particularly when you contribute to the packages on which Courselore depends, so it’s better to use NVM for Windows from the start.
   >
   > - [Python (`python`)](https://www.python.org) and [Visual Studio C++ Build Tools (`visualstudio2022-workload-vctools`)](https://visualstudio.microsoft.com/visual-cpp-build-tools/): These tools are necessary to build native Node.js extensions written in C/C++.
   >
   > - [Visual Studio Code (`vscode`)](https://code.visualstudio.com): A text editor with excellent support for the programming languages used in Courselore.
   >
   > - [Git (`git`)](https://git-scm.com): The version control system used by Courselore.

2. Setup Git:

   - [Username](https://docs.github.com/en/get-started/getting-started-with-git/setting-your-username-in-git#setting-your-git-username-for-every-repository-on-your-computer)
   - [Email](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-user-account/managing-email-preferences/setting-your-commit-email-address#setting-your-email-address-for-every-repository-on-your-computer)
   - [Global `.gitignore` for files such as `.DS_Store` generated by Finder in macOS](https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files#configuring-ignored-files-for-all-repositories-on-your-computer)
   - [SSH keys to connect to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

3. Install the latest version of Node.js with NVM for Windows:

   ```console
   > nvm install latest
   > nvm use <VERSION>
   ```

4. Install the following Visual Studio Code extensions:

   - [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode): Support for [Prettier](https://prettier.io), the code formatter used by Courselore.
   - [`es6-string-html`](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html): Syntax highlighting for HTML & SQL as tagged template literals in TypeScript—a feature heavily used in the Courselore codebase.
   - [Indentation Level Movement](https://marketplace.visualstudio.com/items?itemName=kaiwood.indentation-level-movement): Move up & down by indentation, which helps navigating on HTML.

5. Clone the codebase, install the dependencies, and run Courselore:

   ```console
   > git clone git@github.com:courselore/courselore.git
   > cd courselore/web/
   > npm install
   > npm start
   ```

</details>

<details>

<summary>macOS</summary>

1. Install [Homebrew](https://brew.sh) and the following packages:

   ```console
   $ brew install nvm visual-studio-code git
   ```

   > **Note:** Instead of using Homebrew, you could go to the websites for the development tools and install them by hand, but Homebrew makes installation and updates more straightforward.

   > **Package Breakdown**
   >
   > - [Node Version Manager (`nvm`)](https://github.com/nvm-sh/nvm): A manager of multiple Node.js installations. While in theory you could install just the latest Node.js version directly from Homebrew, in practice you’ll often need to test something in different versions of Node.js, particularly when you contribute to the packages on which Courselore depends, so it’s better to use Node Version Manager from the start.
   >
   > - [Visual Studio Code (`visual-studio-code`)](https://code.visualstudio.com): A text editor with excellent support for the programming languages used in Courselore.
   >
   > - [Git (`git`)](https://git-scm.com): The version control system used by Courselore.

2. Setup Git:

   - [Username](https://docs.github.com/en/get-started/getting-started-with-git/setting-your-username-in-git#setting-your-git-username-for-every-repository-on-your-computer)
   - [Email](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-user-account/managing-email-preferences/setting-your-commit-email-address#setting-your-email-address-for-every-repository-on-your-computer)
   - [Global `.gitignore` for files such as `.DS_Store` generated by Finder in macOS](https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files#configuring-ignored-files-for-all-repositories-on-your-computer)
   - [SSH keys to connect to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

3. Install the latest version of Node.js with Node Version Manager:

   ```console
   $ nvm install node
   ```

4. Install the following Visual Studio Code extensions:

   - [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode): Support for [Prettier](https://prettier.io), the code formatter used by Courselore.
   - [`es6-string-html`](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html): Syntax highlighting for HTML & SQL as tagged template literals in TypeScript—a feature heavily used in the Courselore codebase.
   - [Indentation Level Movement](https://marketplace.visualstudio.com/items?itemName=kaiwood.indentation-level-movement): Move up & down by indentation, which helps navigating on HTML.

5. Clone the codebase, install the dependencies, and run Courselore:

   ```console
   $ git clone git@github.com:courselore/courselore.git
   $ cd courselore/web/
   $ npm install
   $ npm start
   ```

   > **Note:** macOS imposes a limit on the number of files a process can open, but in development Courselore needs to open more files than the default setting allows because it reloads code as soon as you change it. Increase the limit by following [these instructions](https://gist.github.com/abernix/a7619b07b687bb97ab573b0dc30928a0).

</details>

<details>

<summary>Linux (<a href="https://ubuntu.com">Ubuntu</a>)</summary>

1. Install [Homebrew on Linux](https://docs.brew.sh/Homebrew-on-Linux) and the following packages:

   ```console
   $ brew install nvm git
   $ sudo snap install code --classic
   ```

   > **Note:** Instead of using Homebrew, you could go to the websites for the development tools and install them by hand, but Homebrew makes installation and updates more straightforward.

   > **Package Breakdown**
   >
   > - [Node Version Manager (`nvm`)](https://github.com/nvm-sh/nvm): A manager of multiple Node.js installations. While in theory you could install just the latest Node.js version directly from Homebrew, in practice you’ll often need to test something in different versions of Node.js, particularly when you contribute to the packages on which Courselore depends, so it’s better to use Node Version Manager from the start.
   >
   > - [Git (`git`)](https://git-scm.com): The version control system used by Courselore.
   >
   > - [Visual Studio Code (`code`)](https://code.visualstudio.com): A text editor with excellent support for the programming languages used in Courselore.

   > **Why Homebrew for Linux instead of `apt` (a package manager that comes with Ubuntu)?** The packages available from `apt` prioritize stability, so they run behind on the latest releases. This is desirable for long-running servers, but not for development.

   > **Why Homebrew for Linux instead of [Snap](https://snapcraft.io) (another package manager that comes with Ubuntu)?** Snaps use a constrained permissions system that [doesn’t work well with native Node.js extensions written in C/C++](https://github.com/nodejs/snap/issues/3). Note that Snaps are the best option for graphical applications such as Visual Studio Code, which aren’t available in Homebrew for Linux, so in the command above we installed Visual Studio Code from Snap.

2. Setup Git:

   - [Username](https://docs.github.com/en/get-started/getting-started-with-git/setting-your-username-in-git#setting-your-git-username-for-every-repository-on-your-computer)
   - [Email](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-user-account/managing-email-preferences/setting-your-commit-email-address#setting-your-email-address-for-every-repository-on-your-computer)
   - [Global `.gitignore` for files such as `.DS_Store` generated by Finder in macOS](https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files#configuring-ignored-files-for-all-repositories-on-your-computer)
   - [SSH keys to connect to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

3. Install the latest version of Node.js with Node Version Manager:

   ```console
   $ nvm install node
   ```

4. Install the following Visual Studio Code extensions:

   - [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode): Support for [Prettier](https://prettier.io), the code formatter used by Courselore.
   - [`es6-string-html`](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html): Syntax highlighting for HTML & SQL as tagged template literals in TypeScript—a feature heavily used in the Courselore codebase.
   - [Indentation Level Movement](https://marketplace.visualstudio.com/items?itemName=kaiwood.indentation-level-movement): Move up & down by indentation, which helps navigating on HTML.

5. Clone the codebase, install the dependencies, and run Courselore:

   ```console
   $ git clone git@github.com:courselore/courselore.git
   $ cd courselore/web/
   $ npm install
   $ npm start
   ```

</details>

## Sharing the Development Server

It’s often useful to run Courselore in your development machine and access it from another device. For example, you may access it from your phone to test user interface changes, or let someone in a video-chat access it from the internet to assist in investigating an issue.

To make this work, you must establish a network route between your development machine and the device that will access it. There are two ways of doing this:

**Local Area Network (LAN)**

Recommended for: Accessing Courselore from your phone to test user interface changes.

Advantages: Fastest. Works even when you don’t have an internet connection, as long as all the devices are connected to the same LAN/wifi.

Disadvantages: Doesn’t work on some LANs. Doesn’t work across the internet, so may not be used to share a server with someone over video-chat.

<details>
<summary>How to</summary>

1. Determine the LAN address of your development machine, which may be a name such as `leafac--mac-mini.local` or an IP address. The exact procedure depends on your operating system and network configuration.

   > **macOS Tip:** Go to **System Preferences… > Sharing** and take note of the name ending in `.local`.

2. Send the root TLS certificate created by [Caddy](https://caddyserver.com) to the other device.

   > **Example:** In macOS the default location of the certificate is `~/Library/Application Support/Caddy/pki/authorities/local/root.crt`. You may AirDrop that file to an iPhone/iPad.

   > **Note:** Certificates have a `.crt` extension. **Importantly, `.key` files are not certificates.** These `.key` files are signing keys which must never leave your development machine, because they would allow for other devices to intercept and tamper with your network traffic.

3. Install & trust the TLS certificate on the other device.

   > **Note:** The exact procedure depends on the operating system, but typically this process occurs in two steps: First **install** the certificate, then **trust** it.

   > **iPhone/iPad Tip:** Install the certificate on **Settings > General > VPN & Device Management Certificates**, and trust it on **Settings > General > About > Certificate Trust Settings**.

   > **Windows Tip:** Install the certificate under the Logical Store Name called **Trusted Root Certification Authorities > Certificates**.

4. Run Courselore with the `HOSTNAME` environment variable set to the address determined in step 1, for example, in macOS and Linux:

   ```console
   $ env HOSTNAME=leafac--mac-mini.local npm start
   ```

5. Visit the address on the other device.

</details>

**Tunnel**

Recommended for: Letting someone in a video-chat access Courselore from the internet to assist in investigating an issue.

Advantages: Works across the internet.

Disadvantages: Slower. Requires an internet connection.

<details>
<summary>How to</summary>

1. Create the tunnel. If you’re part of the Courselore team, you may request a custom Courselore tunnel address such as `leafac.courselore.org`, otherwise you may use services such as [Localtunnel](https://theboroer.github.io/localtunnel-www/) and [localhost.run](https://localhost.run), for example:

   ```console
   # Custom Courselore Tunnel Address
   $ ssh -NR 9000:127.0.0.1:80 root@leafac.courselore.org

   # Localtunnel
   $ npx localtunnel --port 80

   # localhost.run
   $ ssh -NR 80:127.0.0.1:80 localhost.run
   ```

2. Run Courselore with the `TUNNEL` environment variable set to the address given in step 1, for example, in macOS and Linux:

   ```console
   # Custom Courselore Tunnel Address
   $ env TUNNEL=leafac.courselore.org npm run start

   # Localtunnel
   $ env TUNNEL=tough-feet-train-94-60-46-156.loca.lt npm run start

   # localhost.run
   $ env TUNNEL=497ac574a31cd1.lhrtunnel.link npm run start
   ```

3. Visit the address on the other device.

</details>
