/**
 * VS Code command, setting, view and scheme ids: mariadb-code.* instead of qwen-code.* and
 * qwen.diff.*, so the extension can run beside upstream's companion. The ids are only used
 * inside the extension package (manifest, NLS files, source, tests).
 */
import { replaceInTracked } from './lib.mjs';

export function apply() {
  replaceInTracked(
    'extension ids',
    ['packages/vscode-ide-companion'],
    [
      ['qwen-code-sidebar', 'mariadb-code-sidebar'],
      ['qwen-code.', 'mariadb-code.'],
      ['qwen.diff.', 'mariadb-code.diff.'],
      // Diff URI scheme and the editable-diff language id.
      ['qwen-diff', 'mariadb-code-diff'],
    ],
  );
}
