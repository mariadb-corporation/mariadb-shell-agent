# MariaDB Shell Agent

An AI agent for MariaDB inside Visual Studio Code (and Theia-based IDEs such as the MariaDB Cloud
Workbench): a chat panel, native diffs and workspace context. The extension bundles the agent's
CLI, so nothing else needs to be installed.

MariaDB Shell Agent is a MariaDB build of [Qwen Code](https://github.com/QwenLM/qwen-code), kept in
sync with upstream.

## Features

- **Chat panel**: open it from the MariaDB icon in the activity bar or the command palette
- **Native diffing**: review, edit and accept changes in VS Code's diff view
- **Auto-accept edits mode**: apply changes as they are made
- **File context**: @-mention files, attach files and images, share the active file and selection
- **Sessions**: conversation history and several sessions at once

## Requirements

- Visual Studio Code 1.96.0 or newer, or a compatible editor

## Commands

| Command                                    | Description                                            |
| ------------------------------------------ | ------------------------------------------------------ |
| `MariaDB Shell Agent: Open`                | Open the MariaDB Shell Agent chat panel                |
| `MariaDB Shell Agent: Run`                 | Launch a classic terminal session with the bundled CLI |
| `MariaDB Shell Agent: Accept Current Diff` | Accept the currently displayed diff                    |
| `MariaDB Shell Agent: Close Diff Editor`   | Close/reject the current diff                          |

Settings live in `~/.mariadb-shell-agent/settings.json` (per project: `.mariadb-shell-agent/`), project
instructions in `MARIADB-SHELL-AGENT.md` (`AGENTS.md` is read too), and ignore rules in
`.mariadb-shell-agentignore`. The bundled CLI is available as `mariadb-shell-agent` (short: `msa`).

## License

Apache-2.0, like upstream Qwen Code.
