# MariaDB Code Companion

MariaDB Code inside Visual Studio Code (and Theia-based IDEs such as the MariaDB Cloud IDE): a chat
panel, native diffs and workspace context for the MariaDB Code agent. The extension bundles the
MariaDB Code CLI, so nothing else needs to be installed.

MariaDB Code is a MariaDB build of [Qwen Code](https://github.com/QwenLM/qwen-code), rebased on
upstream regularly.

## Features

- **Chat panel**: open it from the MariaDB icon in the activity bar or the editor title bar
- **Native diffing**: review, edit and accept changes in VS Code's diff view
- **Auto-accept edits mode**: apply changes as they are made
- **File context**: @-mention files, attach files and images, share the active file and selection
- **Sessions**: conversation history and several sessions at once

## Requirements

- Visual Studio Code 1.96.0 or newer, or a compatible editor

## Commands

| Command                             | Description                                            |
| ----------------------------------- | ------------------------------------------------------ |
| `MariaDB Code: Open`                | Open the MariaDB Code chat panel                       |
| `MariaDB Code: Run`                 | Launch a classic terminal session with the bundled CLI |
| `MariaDB Code: Accept Current Diff` | Accept the currently displayed diff                    |
| `MariaDB Code: Close Diff Editor`   | Close/reject the current diff                          |

Settings, commands and the configuration directory keep their upstream identifiers
(`qwen-code.*`, `~/.qwen`), so existing Qwen Code configuration keeps working.

## License

Apache-2.0, like upstream Qwen Code.
