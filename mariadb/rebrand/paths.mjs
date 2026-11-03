/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * File and directory names users see: ~/.mariadb-shell-agent and <project>/.mariadb-shell-agent instead of
 * .qwen, MARIADB-SHELL-AGENT.md instead of QWEN.md, .mariadb-shell-agentignore instead of .qwenignore.
 * Internal files inside those directories (.qwen-session, locks, ...) keep their names.
 */
import {
  CODE_EXTENSIONS,
  patch,
  DOCS_DIRS,
  DOCS_EXTENSIONS,
  SHIPPED_DIRS,
  STRING_ESCAPE,
  rename,
  replaceInTracked,
  trackedFiles,
} from './lib.mjs';

export const CONFIG_DIR = '.mariadb-shell-agent';
export const CONTEXT_FILE = 'MARIADB-SHELL-AGENT';
export const IGNORE_FILE = '.mariadb-shell-agentignore';

const PAIRS = [
  [/\.qwenignore\b/g, IGNORE_FILE],
  // QWEN.md and QWEN.local.md, also lower-cased (paths compared case-insensitively), with the
  // dots escaped inside regexes.
  [
    /\b(qwen|QWEN)((?:\\{0,2}\.(?:local|LOCAL))?\\{0,2}\.(?:md|MD))\b/g,
    (_, name, rest) =>
      `${name === 'QWEN' ? CONTEXT_FILE : CONTEXT_FILE.toLowerCase()}${rest}`,
  ],
  // Alternation members in regexes: `(AGENTS|CLAUDE|QWEN|GEMINI)\.md`, `(qwen|agents)\.md`,
  // `\.(claude|qwen)\/`.
  [
    /(?<=\((?:[\w-]+\|)*)(qwen|QWEN)(?=(?:\|[\w-]+)*\)\\\.(?:md|MD))/g,
    (name) => (name === 'QWEN' ? CONTEXT_FILE : CONTEXT_FILE.toLowerCase()),
  ],
  [/(?<=\\\.\((?:[\w-]+\|)*)qwen(?=(?:\|[\w-]+)*\))/g, CONFIG_DIR.slice(1)],
  // Whole-stem meta file names (`...|qwen|agents|claude)$/i`).
  ['|qwen|agents|', `|${CONTEXT_FILE.toLowerCase()}|agents|`],
  // ".qwen" as a whole path segment. Not a property (`manifest?.qwen`, `x!.qwen`), part of a
  // host name (chat.qwen.ai) or of a longer name (.qwen-session, .qwencode.*). It may follow a
  // regex back-reference (`'$1.qwen'`), a URL-encoded slash (`%2F.qwen`), an escaped newline
  // (`'\n.qwen'`, also as the gitignore negation `'\n!.qwen'`), a glued shell flag (`-o.qwen`) or
  // git pathspec magic (`':(exclude).qwen/tmp'`).
  [
    new RegExp(
      String.raw`(?:(?<=\$\d|%2F|${STRING_ESCAPE}!?|\s-[A-Za-z]|:\([a-z,]+\))|(?<![\w.\-?)\]])(?<![\w)\]]!))\.(qwen|QWEN)(?![\w-])`,
      'g',
    ),
    (_, name) => (name === 'QWEN' ? CONFIG_DIR.toUpperCase() : CONFIG_DIR),
  ],
];

export function apply() {
  // Files and directories named after the old brand: QWEN.md context files anywhere in the
  // repository (shipped extension examples, files tests refer to), and the repository's own
  // project directory (read by tests such as the /review policy check).
  for (const file of trackedFiles(['.', ':!mariadb'])) {
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

  // The longer directory name pushes two workflow tool descriptions past their size budgets.
  patch(
    'workflow description budgets',
    'packages/core/src/tools/workflow/workflow.test.ts',
    /\['scriptPath', 950\]|toBeLessThanOrEqual\(29_500\)/g,
    (m) => m.replace(/(950|29_500)/, '$1 + 64'),
    (t) => t.includes("['scriptPath', 950 + 64]"),
  );
}
