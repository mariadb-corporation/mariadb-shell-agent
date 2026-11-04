/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Workspace settings for developing the fork in VS Code: the NPM Scripts view lists only the root
 * package.json, not the 40-odd workspace packages, integrations, test fixtures, the docs site,
 * scripts and the build output (dist/examples).
 */
import { patchJson } from './lib.mjs';

const NPM_EXCLUDE = [
  '**/packages/**',
  '**/integrations/**',
  '**/integration-tests/**',
  '**/docs-site/**',
  '**/scripts/**',
  '**/dist/**',
];

export function apply() {
  patchJson('vscode-settings', '.vscode/settings.json', (settings) => {
    settings['npm.exclude'] = NPM_EXCLUDE;
  });
}
