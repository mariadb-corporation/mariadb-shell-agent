/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GitHub setup. Upstream's Actions workflows, Dependabot config and code owners belong to QwenLM's
 * repository: here they would run against secrets and runners we don't have, open dependency
 * pull requests and request reviews from upstream's maintainers. They are removed, and our own
 * workflows, actions and code owners from mariadb/github/ take their place. Upstream's
 * .github/scripts and .github/actions stay (upstream tests read some of them, our workflows don't
 * use them).
 */
import fs from 'node:fs';
import path from 'node:path';
import { mariadbDir, remove, trackedFiles, write } from './lib.mjs';

const OURS = path.join(mariadbDir, 'github');

export function apply() {
  const ours = new Map(
    fs
      .readdirSync(OURS, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const abs = path.join(entry.parentPath, entry.name);
        return [path.join('.github', path.relative(OURS, abs)), abs];
      }),
  );
  for (const file of trackedFiles([
    '.github/workflows',
    '.github/dependabot.yml',
    '.github/CODEOWNERS',
  ]))
    if (!ours.has(file)) remove('github', file);
  for (const [file, abs] of ours) write(file, fs.readFileSync(abs, 'utf8'));
}
