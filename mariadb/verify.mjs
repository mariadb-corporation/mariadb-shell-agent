#!/usr/bin/env node
/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Test gate for the branded tree: which unit test failures does the branding cause?
 *
 *   node mariadb/verify.mjs [--quick] [--package <dir>]... [--shard <i>/<n>]
 *
 * 1. Runs the unit tests of the packages the rebrand touches (--quick: all but the CLI's;
 *    --package: only these; --shard: vitest's share i of n of each package's test files, so CI
 *    can spread a package over several jobs).
 * 2. Reruns each failing test file on its own, twice, to drop failures that only happen under load.
 * 3. Reruns what still fails against the pristine upstream sources the branch is built on
 *    (mariadb/UPSTREAM, temporarily checked out over the working tree, then restored), so
 *    failures upstream has as well are not blamed on us.
 *
 * Needs a clean working tree (it restores from HEAD). Exits 1 if failures remain that only the
 * branded tree has.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { root } from './rebrand/lib.mjs';

const PACKAGES = [
  'packages/vscode-ide-companion',
  'packages/web-shell',
  'packages/acp-bridge',
  'packages/sdk-typescript',
  'packages/core',
  'packages/cli',
];
const args = process.argv.slice(2);
const optionValues = (name) =>
  args.flatMap((a, i) => (a === name ? [args[i + 1]] : []));
const quick = args.includes('--quick');
const only = optionValues('--package').map((p) => p.replace(/\/$/, ''));
const shard = optionValues('--shard')[0];
for (const p of only)
  if (!PACKAGES.includes(p)) {
    console.error(
      `verify: unknown package ${p} (one of ${PACKAGES.join(', ')})`,
    );
    process.exit(1);
  }
const packages = only.length
  ? only
  : quick
    ? PACKAGES.filter((p) => p !== 'packages/cli')
    : PACKAGES;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mariadb-verify-'));

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

if (git('status', '--porcelain')) {
  console.error(
    'verify: working tree not clean; commit first (verify restores from HEAD)',
  );
  process.exit(1);
}

/**
 * Runs vitest in `pkg` (only `files`, or the --shard share of all); returns the failing tests as
 * "file > name".
 */
function failingTests(pkg, files = []) {
  const out = path.join(tmp, `${pkg.replaceAll('/', '_')}-${Date.now()}.json`);
  const select = files.length ? files : shard ? [`--shard=${shard}`] : [];
  spawnSync(
    'npx',
    ['vitest', 'run', '--reporter=json', `--outputFile=${out}`, ...select],
    {
      cwd: path.join(root, pkg),
      stdio: 'ignore',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
    },
  );
  if (!fs.existsSync(out))
    return new Set([`${pkg}: vitest produced no report`]);
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  const failed = new Set();
  for (const file of report.testResults ?? []) {
    const rel = path.relative(path.join(root, pkg), file.name);
    const tests = (file.assertionResults ?? []).filter(
      (t) => t.status === 'failed',
    );
    // A file that fails to load reports no test results at all.
    if (file.status === 'failed' && tests.length === 0)
      failed.add(`${rel} > (file failed to run)`);
    for (const t of tests) failed.add(`${rel} > ${t.fullName}`);
  }
  return failed;
}

// The upstream commit the branch is built on (mariadb/sync-upstream.sh records it).
const base = fs
  .readFileSync(path.join(root, 'mariadb', 'UPSTREAM'), 'utf8')
  .trim();

const filesOf = (tests) => [
  ...new Set([...tests].map((t) => t.split(' > ')[0])),
];

const ours = [];
for (const pkg of packages) {
  process.stdout.write(`${pkg}: running… `);
  let failed = failingTests(pkg);
  // Each failing file again on its own, twice: only tests failing every time count (several
  // suites spawn real processes and time out under the load of a full run).
  for (let round = 0; round < 2 && failed.size; round++) {
    const again = new Set();
    for (const file of filesOf(failed)) {
      for (const t of failingTests(pkg, [file]))
        if (failed.has(t)) again.add(t);
    }
    failed = again;
  }
  if (!failed.size) {
    console.log('ok');
    continue;
  }
  // Same files on pristine upstream sources.
  git('checkout', base, '--', '.', ':!mariadb');
  let upstream;
  try {
    upstream = failingTests(
      pkg,
      filesOf(failed).filter((f) => fs.existsSync(path.join(root, pkg, f))),
    );
  } finally {
    git('reset', '-q', '--hard', 'HEAD');
    git('clean', '-fdq', '--', '.', ':!mariadb');
  }
  const mine = [...failed].filter((t) => !upstream.has(t));
  console.log(
    `${failed.size} failing, ${failed.size - mine.length} also upstream, ${mine.length} ours`,
  );
  ours.push(...mine.map((t) => `${pkg}/${t}`));
}

if (ours.length) {
  console.log('\nFailures caused by the branding:');
  for (const t of ours) console.log(`  ${t}`);
  process.exit(1);
}
console.log('\nverify: no failures caused by the branding');
