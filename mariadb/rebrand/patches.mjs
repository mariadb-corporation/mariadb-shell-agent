/**
 * Code changes of our own, kept as patch files in mariadb/patches/ (each starts with a short
 * explanation). They are written against the pristine upstream files and applied before the
 * other rules. A patch that no longer applies stops the run: upstream changed that code, and
 * the patch must be redone against it.
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
    if (gitApply([], patch)) count('patches');
    else failures.push(`patch ${name} no longer applies to the upstream code`);
  }
}
