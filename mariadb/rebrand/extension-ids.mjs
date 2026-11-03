/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * VS Code command, setting, view and scheme ids: mariadb-shell-agent.* instead of qwen-code.* and
 * qwen.diff.*, so the extension can run beside upstream's companion. The ids are only used
 * inside the extension package (manifest, NLS files, source, tests).
 */
import { replaceInTracked } from './lib.mjs';

export function apply() {
  replaceInTracked(
    'extension ids',
    ['packages/vscode-ide-companion'],
    [
      ['qwen-code-sidebar', 'mariadb-shell-agent-sidebar'],
      ['qwen-code.', 'mariadb-shell-agent.'],
      ['qwen.diff.', 'mariadb-shell-agent.diff.'],
      // Diff URI scheme and the editable-diff language id.
      ['qwen-diff', 'mariadb-shell-agent-diff'],
    ],
  );
}
