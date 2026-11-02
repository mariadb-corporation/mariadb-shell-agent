/** "Qwen Code" → "MariaDB Shell Agent" in UI strings, prompts, locales, tests and snapshots. */
import {
  DOCS_DIRS,
  DOCS_EXTENSIONS,
  PRODUCT,
  SHIPPED_DIRS,
  UPSTREAM_PRODUCT,
  replaceInTracked,
} from './lib.mjs';

// Everything shipped (CLI bundle, VS Code extension, Web Shell) and the user docs, which are
// bundled for the agent's built-in help. Tests and snapshots follow the source.
// Also the repository's own project directory (renamed later by paths.mjs), which tests read.
const DIRS = [...SHIPPED_DIRS, ...DOCS_DIRS, '.qwen'];

const SKIP = [
  // /review parses its own footers; review.mjs rebrands that module as a whole.
  /^packages\/cli\/src\/commands\/review\//,
  // Our own README, which credits the upstream project.
  /^packages\/vscode-ide-companion\/README\.md$/,
];

export function apply() {
  replaceInTracked(
    'product name',
    DIRS,
    [
      // The tool summary in the deferred-tools reminder is cut at a length budget; the longer
      // name would push "completed tasks are revived" past it.
      [
        'or another Qwen Code session (use "to")',
        'or another session (use "to")',
      ],
      [UPSTREAM_PRODUCT, PRODUCT],
      // A lowercase variant of the name as a path segment (the case-variant clone target test).
      ["'qwen code'", `'${PRODUCT.toLowerCase()}'`],
      // The agent's self-description in the system prompt (and its snapshots).
      [' developed by Alibaba Group, ', ' developed by MariaDB, '],
      // Bare "Qwen" naming the agent (not the model family) in visible CLI text.
      ['ask Qwen', `ask ${PRODUCT}`],
      ['How is Qwen doing', `How is ${PRODUCT} doing`],
      ['stdout shown to Qwen', `stdout shown to ${PRODUCT}`],
      // The extension's welcome text: the agent does more than write code.
      [
        'Connect a model provider to start coding with Qwen.',
        'Connect a model provider to get started.',
      ],
      [
        '连接一个模型服务商，开始使用 Qwen 编码。',
        '连接一个模型服务商即可开始使用。',
      ],
      // The Web Shell welcome subtitle (anchored to its key: CLI dialogs ask "What would you like
      // to do?" about other things).
      [
        "'welcome.prompt': 'What would you like to do?'",
        "'welcome.prompt': 'What would you like to work on?'",
      ],
      [
        "'welcome.prompt': '你想构建什么？'",
        "'welcome.prompt': '你想做些什么？'",
      ],
    ],
    { skip: SKIP, extensions: DOCS_EXTENSIONS },
  );
}
