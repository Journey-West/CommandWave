# CommandWave

<div align="center">
  <img src="static/img/commandwave-logo.png" alt="CommandWave Logo" width="400">
  <p><em>A cyberpunk-themed web interface for managing terminal sessions alongside executable Markdown playbooks.</em></p>
  <br>
  <a href="https://github.com/Journey-West/CommandWave/actions"><img src="https://img.shields.io/github/actions/workflow/status/Journey-West/CommandWave/main.yml?branch=main&style=flat-square" alt="CI Status"></a>
  <img src="https://img.shields.io/badge/python-3.6+-blue?style=flat-square" alt="Python Version">
  <img src="https://img.shields.io/github/license/Journey-West/CommandWave?style=flat-square" alt="License">
</div>

> 🚀 **Try CommandWave in seconds!**
>
> 1. Clone the repo: `git clone https://github.com/Journey-West/CommandWave`
> 2. Install Python deps: `pip install -r requirements.txt`
> 3. Install `ttyd` and `tmux`
> 4. Run: `python main.py --use-default-tmux-config`
> 5. Visit [http://localhost:5000](http://localhost:5000)

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Running CommandWave](#running-commandwave)
- [Usage Guide](#usage-guide)
- [Contributing](#contributing)
- [Community & Support](#community--support)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Overview

CommandWave provides a streamlined, web-based environment for managing multiple terminal sessions powered by `tmux` and `ttyd`. It features a distinct cyberpunk/neon aesthetic and allows users to work with Markdown-based "playbooks" containing executable code blocks. Define variables, search through local playbooks, and execute commands directly into your active terminal session, enhancing command-line workflows.

![CommandWave Screenshot](static/img/screenshot.png)

> **Why CommandWave?**
>
> - ⚡️ Real-time multi-session terminal management
> - 📝 Executable Markdown playbooks
> - 🌈 Cyberpunk/neon themed UI
> - 🔄 Seamless synchronization across browsers
> - 🛠️ Designed for pentesting, automation, and teaching

## Features

* **Multi-Tab Terminal Management**: Create, name, switch between, and close multiple `tmux`-backed terminal sessions via `ttyd`.
* **Markdown Playbook Integration**:
    * Upload Markdown (`.md`) files as playbooks.
    * Create new playbooks directly within the application.
    * Playbooks are parsed to separate text blocks from code blocks.
    * Cross-reference between playbooks using special syntax.
    * Playbooks synchronize across sessions and clients automatically.
* **Executable Code Blocks**: Execute shell command blocks from playbooks directly into the active terminal session.
* **Variable Substitution**: 
    * Define variables with user-friendly titles and reference names.
    * Variables are automatically substituted into code blocks before execution.
    * Variables persist and synchronize across browser sessions and devices.
* **Synchronization**:
    * Terminal tabs, playbooks, and variables sync across all connected sessions.
    * Changes made in one browser window reflect in all others in real-time.
    * All user data persists between browser sessions.
* **Playbook Search**: Quickly search across all loaded playbooks for specific commands or text.
* **Theme Selection**:
    * Switch between the default cyberpunk dark theme, neon light theme, and witch hazel theme.
    * Theme preference is saved between sessions.
    * Terminal areas remain dark in all themes for optimal readability.
* **Enhanced Code Readability**:
    * Syntax highlighting with cyberpunk-style neon colors.
    * Specially enhanced visibility for command names and arguments.
    * Common pentesting tools and commands highlighted for better readability.
* **Persistent Notes**:
    * A global notes panel for general information.
    * A separate notes panel for each terminal tab. Notes are saved automatically.
* **Error Handling**: Dedicated error modals with clear messages for various error conditions.
* **Cyberpunk UI**: A visually distinct interface inspired by neon and cyberpunk aesthetics, including a matching `tmux` theme option.
* **Custom tmux Theming**: Includes an optional, enhanced `tmux` configuration file (`commandwave_theme.tmux.conf`) for a cohesive visual experience.

## Requirements

* Python 3.6+
* Flask (and other libraries listed in `requirements.txt`)
* **`ttyd`**: A command-line tool for sharing terminals over the web.
    * *Installation*: Download binaries or build from source via the [official ttyd GitHub repository](https://github.com/tsl0922/ttyd).
* **`tmux`**: A terminal multiplexer.
    * *Installation*: Typically available via system package managers (e.g., `sudo apt install tmux`, `brew install tmux`).

## Installation

1.  **Install System Dependencies**: Ensure `ttyd` and `tmux` are installed and accessible in your system's PATH. Refer to their respective documentation for installation instructions.
2.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Journey-West/CommandWave
    cd CommandWave
    ```
3.  **Install Python Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

## Running CommandWave

1.  **Navigate to the Directory**:
    ```bash
    cd CommandWave
    ```
2.  **Start the Application**:
    ```bash
    python main.py --use-default-tmux-config
    ```
3.  **Access the UI**: Open your web browser and go to `http://localhost:5000` (or the port specified if using the `--port` option).

### Command Line Options 

* `--port PORT`: Specify the port for the web server (default: 5000).
* `--use-default-tmux-config`: Apply the custom `commandwave_theme.tmux.conf` to the `tmux` sessions managed by CommandWave.
* `--hostname HOSTNAME`: Specify the hostname to use for terminal connections (default: localhost).
* `--remote`: Enable remote access by binding to all interfaces (use with caution).

## Usage Guide

1.  **Terminals**:
    * The main terminal is available on launch.
    * Click the `+` button in the terminal tabs bar to create a new terminal session. You'll be prompted for a name.
    * Click on a tab to switch to that terminal.
    * Double-click a tab name (not the 'x') to rename it.
    * Click the `x` on a tab to close that terminal session.
    * Terminal tabs synchronize across all browser sessions connected to the same server.
2.  **Theme Settings**:
    * Click the gear icon in the top right corner and select "Theme Settings" to open the theme modal.
    * Choose between "Cyberpunk Dark" (default), "Neon Light", and "Witch Hazel" themes.
    * Your selection is saved in the browser and will persist between sessions.
3.  **Variables**:
    * Use the "Variables" section to define variables for use in your playbooks.
    * Click "+ Add Variable" to create custom variables.
    * Each variable has two parts:
        * **Variable Title**: A user-friendly display name (can include spaces)
        * **Variable Reference**: The actual reference name used in code (no spaces allowed, automatically prefixed with $)
    * Example: Title "Target IP Address" with Reference "targetIp" would be used as `$targetIp` in code blocks.
    * Variables will be substituted when you click "Execute" on a code block.
    * Variables synchronize across browser sessions and persist between sessions.
4.  **Playbooks**:
    * Click "Upload Playbook" to load `.md` files.
    * Click "Create Playbook" to author a new playbook within the app.
    * Playbooks appear in the section below the controls. Click the playbook title to expand/collapse its content.
    * Within code blocks (` ``` `), click:
        * **Copy**: Copies the code (with variables substituted) to the clipboard.
        * **Execute**: Sends the code (with variables substituted) to the *currently active* terminal tab for execution.
        * **Edit**: Double-click on a code block to edit it. Press Ctrl+Enter or click the Save button to save changes.
    * Links within playbooks to other .md files will load those playbooks, while external links open in new tabs.
    * Create cross-references between playbooks using the syntax: `[Link Text](playbook:playbook_name.md)`.
    * Playbooks synchronize across browser sessions and persist between sessions.
5.  **Search**:
    * Use the search bar to find lines within any loaded playbook's content.
    * Results show the filename, line number, and content. Click on a result to open that playbook.
6.  **Notes**:
    * Click "Global Notes" or "Tab Notes" in the header to toggle the respective side panels.
    * Content is saved automatically as you type.
    * Notes persist between sessions.
7.  **Error Handling**:
    * The application displays dedicated error modals with clear messages for various error conditions.
    * These modals include specific guidance on how to resolve common issues.

## Contributing

Contributions are welcome! Please follow standard fork-and-pull-request workflows.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/your-feature`).
3.  Commit your changes (`git commit -m 'Add some feature'`).
4.  Push to the branch (`git push origin feature/your-feature`).
5.  Open a Pull Request.

## Community & Support

- 💬 [GitHub Discussions](https://github.com/Journey-West/CommandWave/discussions) — Ask questions, share ideas, or get help
- 🐞 [Issue Tracker](https://github.com/Journey-West/CommandWave/issues) — Report bugs or request features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

* Built using [Flask](https://flask.palletsprojects.com/), [ttyd](https://github.com/tsl0922/ttyd), and [tmux](https://github.com/tmux/tmux).
* Utilizes [Marked.js](https://marked.js.org/) for Markdown parsing and [Prism.js](https://prismjs.com/) for syntax highlighting.
* Cyberpunk UI inspiration drawn from various synthwave and neon aesthetics.
