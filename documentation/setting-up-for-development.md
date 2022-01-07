# Setting Up for Development

CourseLore has been designed to be welcoming to new developers. It’s an excellent first project for people new to contributing to open-source software.

> **Note:** If you get stuck, please [open an issue](https://github.com/courselore/courselore/issues/new) including as much information as possible: What you tried, what you expected to happen, what really happened, what error messages you saw, and so forth.

### Running Pre-Compiled Binaries Locally

The best way to get started is to run a pre-compiled CourseLore binary on your machine. You may download CourseLore from two channels: The latest development versions are available as [Actions Artifacts](https://github.com/courselore/courselore/actions), and stable versions are available as [Releases](https://github.com/courselore/courselore/releases).

> **Note:** You must be signed in to GitHub to download GitHub Actions Artifacts.

> **Note:** CourseLore needs some network ports to be available: 80, 443, 4000, and 4001. If you have other applications bound to those network ports, you must stop them. In macOS and Linux you may find which application is bound to a network port using, for example, `lsof -i:80`.

> **Note:** Most Linux distributions prevent regular users from binding to network ports lower than 1024. This is a setting that is [safe to disable](https://github.com/small-tech/auto-encrypt/tree/a917892b93b61cd3b80a6f3919db752e2c5a9f6c#a-note-on-linux-and-the-security-farce-that-is-privileged-ports).

### Running from Source

1. Install the development tools.

   > **Windows**
   >
   > Install [Chocolatey](https://chocolatey.org) and the following packages:
   >
   > ```console
   > > choco install nvm python visualstudio2019-workload-vctools vscode git
   > ```
