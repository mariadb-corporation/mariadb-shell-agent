/**
 * File and directory names users see: ~/.mariadb-code and <project>/.mariadb-code instead of
 * .qwen, MARIADB-CODE.md instead of QWEN.md, .mariadb-codeignore instead of .qwenignore.
 * Internal files inside those directories (.qwen-session, locks, ...) keep their names.
 */
import {
  CODE_EXTENSIONS,
  DOCS_DIRS,
  DOCS_EXTENSIONS,
  SHIPPED_DIRS,
  rename,
  replaceInTracked,
  trackedFiles,
} from './lib.mjs';

export const CONFIG_DIR = '.mariadb-code';
export const CONTEXT_FILE = 'MARIADB-CODE';
export const IGNORE_FILE = '.mariadb-codeignore';

const PAIRS = [
  [/\.qwenignore\b/g, IGNORE_FILE],
  // QWEN.md and QWEN.local.md.
  [/\bQWEN(\.local)?\.md\b/g, `${CONTEXT_FILE}$1.md`],
  // ".qwen" as a whole path segment: not a property (`manifest?.qwen`), part of a host name
  // (chat.qwen.ai) or of a longer name (.qwen-session, .qwencode.*).
  [/(?<![\w.\-?)\]!])\.qwen(?![\w-])/g, CONFIG_DIR],
];

export function apply() {
  // Files and directories named after the old brand: context files of the shipped extension
  // examples, and the repository's own project directory (read by tests such as the /review
  // policy check).
  for (const file of trackedFiles([...SHIPPED_DIRS, '.qwen'])) {
    const to = file
      .replace(/(^|\/)QWEN(\.local)?\.md$/, `$1${CONTEXT_FILE}$2.md`)
      .replace(/^\.qwen\//, `${CONFIG_DIR}/`);
    if (to !== file) rename('config file names', file, to);
  }
  // eslint.config.js ignores the repository's project directory.
  replaceInTracked(
    'config paths',
    [...SHIPPED_DIRS, '.qwen', 'eslint.config.js'],
    PAIRS,
    {
      extensions: CODE_EXTENSIONS,
    },
  );
  replaceInTracked(
    'config paths',
    [...SHIPPED_DIRS, ...DOCS_DIRS, '.qwen'],
    PAIRS,
    {
      extensions: DOCS_EXTENSIONS,
      skip: [/^packages\/vscode-ide-companion\/README\.md$/],
    },
  );
}
