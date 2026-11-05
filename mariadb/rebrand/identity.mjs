/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * VS Code extension identity: its own id, so it installs beside upstream's companion and never
 * offers upstream's Marketplace build as an "update".
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  PRODUCT,
  failures,
  mariadbDir,
  patchJson,
  replaceInTracked,
  write,
} from './lib.mjs';

export const EXTENSION_ID = 'MariaDB.mariadb-shell-agent';
export const EXTENSION_NAME = 'mariadb-shell-agent';
export const REPOSITORY_URL =
  'git+https://github.com/mariadb-corporation/mariadb-shell-agent.git';

export function apply() {
  // The npm workspace name is the extension name, so build scripts that address the workspace
  // by name are included.
  replaceInTracked(
    'extension id',
    [
      '.',
      ':!*.md',
      ':!.github',
      ':!docs',
      ':!docs-site',
      ':!mariadb',
      // The lockfile pins a checksum of .pnpmfile.mjs; nothing depends on the extension package.
      ':!.pnpmfile.mjs',
    ],
    [
      ['qwenlm.qwen-code-vscode-ide-companion', EXTENSION_ID],
      ['qwen-code-vscode-ide-companion', EXTENSION_NAME],
    ],
  );

  patchJson(
    'extension manifest',
    'packages/vscode-ide-companion/package.json',
    (pkg) => {
      if (pkg.name !== EXTENSION_NAME) {
        failures.push(`extension manifest: named "${pkg.name}"`);
      }
      Object.assign(pkg, {
        displayName: PRODUCT,
        description:
          'An AI agent for MariaDB, with direct access to your VS Code workspace.',
        publisher: 'MariaDB',
        keywords: [
          'mariadb',
          'mariadb shell',
          'mariadb shell agent',
          'ai',
          'agent',
          'cli',
          'ide companion',
        ],
      });
      pkg.repository = { ...pkg.repository, url: REPOSITORY_URL };
    },
  );

  // The workspace root's repository is also the dist CLI package's (scripts/prepare-package.js).
  for (const file of ['package.json', 'packages/cli/package.json'])
    patchJson('repository', file, (pkg) => {
      if (!pkg.repository) return false;
      pkg.repository = { ...pkg.repository, url: REPOSITORY_URL };
    });

  // The repository README, also packaged with the CLI (dist/README.md, the npm page).
  write(
    'README.md',
    fs.readFileSync(path.join(mariadbDir, 'product-README.md'), 'utf8'),
  );
  write(
    'packages/vscode-ide-companion/README.md',
    fs.readFileSync(
      path.join(mariadbDir, 'vscode-extension', 'README.md'),
      'utf8',
    ),
  );
  // Upstream's contribution guide is QwenLM's process; ours points to MariaDB's.
  write(
    'CONTRIBUTING.md',
    fs.readFileSync(path.join(mariadbDir, 'CONTRIBUTING.md'), 'utf8'),
  );
}
