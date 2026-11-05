/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Channels we do not ship. The QQ Bot channel depends on @tencent-connect/qqbot-connector, which
 * declares itself UNLICENSED and ships neither a license file nor a repository, so it cannot go
 * into a product we distribute under Apache-2.0. The CLI stops bundling it: the channel leaves the
 * built-in registry and the CLI's dependencies (package.json and the lockfile importer, so
 * `pnpm install --frozen-lockfile` still matches), and its user guide goes. The workspace package
 * packages/channels/qqbot itself stays, untouched and unbundled, so upstream's workspace lists and
 * tests keep working.
 */
import { patch, patchJson, remove } from './lib.mjs';

const RULE = 'channels';
const QQBOT = '@qwen-code/channel-qqbot';

export function apply() {
  patch(
    RULE,
    'packages/cli/src/commands/channel/channel-registry.ts',
    /^\s*\{ name: 'qqbot', promise: import\('@qwen-code\/channel-qqbot'\) \},\n/m,
    '',
    (s) => !s.includes(QQBOT),
  );
  patchJson(RULE, 'packages/cli/package.json', (pkg) => {
    delete pkg.dependencies[QQBOT];
  });
  patch(
    RULE,
    'pnpm-lock.yaml',
    /^      '@qwen-code\/channel-qqbot':\n        specifier: workspace:\*\n        version: link:\.\.\/channels\/qqbot\n/m,
    '',
    (s) => !s.includes(`'${QQBOT}':`),
  );

  // The registry test enumerates the built-in channel types.
  patch(
    RULE,
    'packages/cli/src/commands/channel/channel-registry.test.ts',
    /^      'feishu',\n      'qq',\n      'github',\n/m,
    "      'feishu',\n      'github',\n",
    (s) => !s.includes("'qq',"),
  );

  remove(RULE, 'docs/users/features/channels/qqbot.md');
  patch(
    RULE,
    'docs/users/features/channels/_meta.ts',
    /^  qqbot: 'QQ Bot',\n/m,
    '',
    (s) => !s.includes('qqbot'),
  );
  patch(
    RULE,
    'docs/users/features/channels/overview.md',
    /\[QQ Bot\]\(\.\/qqbot\), /,
    '',
    (s) => !s.includes('(./qqbot)'),
  );
  patch(
    RULE,
    'docs/users/features/channels/overview.md',
    / See \[QQ Bot\]\(\.\/qqbot#images-videos-and-files\) for details\./,
    '',
    (s) => !s.includes('(./qqbot#'),
  );
}
