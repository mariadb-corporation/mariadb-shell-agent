/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Code changes of our own, kept as patch files in mariadb/patches/ (each starts with a short
 * explanation). They are written against the pristine upstream files and applied before the
 * other rules, with a three-way merge, so upstream edits next to a patched line merge on their
 * own. A real conflict stops the run, and the patch must be redone against the new code.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { count, failures, mariadbDir, root } from './lib.mjs';

function gitApply(args, patch) {
  try {
    execFileSync('git', ['apply', ...args, patch], {
      cwd: root,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

export function apply() {
  // Only on pristine upstream files; on an already branded tree the later rules have reworded
  // patched lines, so a patch neither applies nor reverses cleanly.
  const manifest = path.join(
    root,
    'packages/vscode-ide-companion/package.json',
  );
  if (JSON.parse(fs.readFileSync(manifest, 'utf8')).publisher === 'MariaDB')
    return;
  const dir = path.join(mariadbDir, 'patches');
  for (const name of fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.patch'))
    .sort()) {
    const patch = path.join(dir, name);
    // --3way: when upstream changed neighbouring lines, merge using the blobs the patch records;
    // stop only on a real conflict (left as conflict markers for redoing the patch).
    if (gitApply(['--3way'], patch)) count('patches');
    else
      failures.push(
        `patch ${name} conflicts with the upstream code; redo it (see mariadb/README.md)`,
      );
  }
}
