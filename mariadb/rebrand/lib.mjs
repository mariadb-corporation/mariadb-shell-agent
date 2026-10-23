/**
 * Helpers shared by the rebrand rules (mariadb/rebrand/*.mjs).
 *
 * Every helper that edits an upstream file either finds its anchor or records a failure, so a
 * rule that upstream has outgrown stops the run instead of silently leaving Qwen behaviour in.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const mariadbDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
export const root = path.resolve(mariadbDir, '..');
export const assets = path.join(mariadbDir, 'assets');

export const PRODUCT = 'MariaDB Code';
export const UPSTREAM_PRODUCT = 'Qwen Code';

/** Workspace packages that end up in the CLI bundle, the VS Code extension or the Web Shell. */
export const SHIPPED_DIRS = [
  'packages/cli',
  'packages/core',
  'packages/acp-bridge',
  'packages/vscode-ide-companion',
  'packages/web-shell',
  'packages/web-templates',
  'packages/sdk-typescript',
  'packages/browser-use',
  'packages/audio-capture',
  'packages/channels',
  'packages/qwen-live',
  'packages/node-repl',
  'packages/mobile-mcp',
  'packages/cua-driver/typescript',
  'integrations',
  'scripts',
];
/** User docs: bundled into the CLI (dist/bundled/qc-helper/docs) and read by the agent. */
export const DOCS_DIRS = ['docs/users'];

export const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.html',
  '.snap',
  '.webmanifest',
]);
export const DOC_EXTENSIONS = new Set(['.md', '.mdx']);
/** Docs directories also hold JSON examples. */
export const DOCS_EXTENSIONS = new Set([...CODE_EXTENSIONS, ...DOC_EXTENSIONS]);

// Never rewritten: upstream attribution and third-party notices.
const ALWAYS_SKIP = [
  /(^|\/)CHANGELOG\.md$/,
  /(^|\/)NOTICES\.txt$/,
  /(^|\/)LICENSE$/,
];

export const failures = [];
export const stats = new Map();
let changedFiles = 0;

export function count(rule, n = 1) {
  stats.set(rule, (stats.get(rule) ?? 0) + n);
}

export function changed() {
  return changedFiles;
}

export function exists(file) {
  return fs.existsSync(path.join(root, file));
}

export function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

export function write(file, content) {
  const abs = path.join(root, file);
  if (fs.existsSync(abs) && fs.readFileSync(abs, 'utf8') === content) return;
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  changedFiles++;
}

export function copyAsset(from, to) {
  const src = path.join(assets, from);
  const dest = path.join(root, to);
  if (!fs.existsSync(dest)) {
    failures.push(`copy ${from}: upstream file ${to} no longer exists`);
    return;
  }
  if (!fs.readFileSync(src).equals(fs.readFileSync(dest))) {
    fs.copyFileSync(src, dest);
    changedFiles++;
  }
}

/** Replaces `pattern` in `file`; fails unless it matched or the branded result is already there. */
export function patch(rule, file, pattern, replacement, alreadyDone) {
  if (!exists(file)) {
    failures.push(`${rule}: ${file} no longer exists`);
    return;
  }
  const before = read(file);
  if (alreadyDone(before)) return;
  const after = before.replace(pattern, replacement);
  if (after === before) {
    failures.push(`${rule}: anchor not found in ${file}`);
    return;
  }
  write(file, after);
}

/** Edits a JSON file through `edit(object)`; fails if the file is gone. */
export function patchJson(rule, file, edit) {
  if (!exists(file)) {
    failures.push(`${rule}: ${file} no longer exists`);
    return;
  }
  const obj = JSON.parse(read(file));
  if (edit(obj) === false)
    failures.push(`${rule}: unexpected content in ${file}`);
  write(file, JSON.stringify(obj, null, 2) + '\n');
}

// Files moved by rename() in this run; git still lists them under their old names.
const renamed = new Map();

export function trackedFiles(pathspecs) {
  return execFileSync('git', ['ls-files', '-z', '--', ...pathspecs], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
    .split('\0')
    .filter(Boolean)
    .map((file) => renamed.get(file) ?? file);
}

/**
 * Applies [from, to] pairs (string or global RegExp) to the tracked files under `pathspecs`
 * whose extension is in `extensions`, skipping files matching `skip`. Copyright lines stay
 * untouched. Returns the number of files changed.
 */
export function replaceInTracked(
  rule,
  pathspecs,
  pairs,
  { extensions = CODE_EXTENSIONS, skip = [] } = {},
) {
  let hits = 0;
  for (const file of trackedFiles(pathspecs)) {
    if (!extensions.has(path.extname(file))) continue;
    if (ALWAYS_SKIP.some((re) => re.test(file))) continue;
    if (skip.some((re) => re.test(file))) continue;
    const abs = path.join(root, file);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    const next = text
      .split('\n')
      .map((line) =>
        /copyright/i.test(line)
          ? line
          : pairs.reduce((l, [from, to]) => l.replaceAll(from, to), line),
      )
      .join('\n');
    if (next === text) continue;
    hits++;
    write(file, next);
  }
  count(rule, hits);
  return hits;
}

/** Moves a tracked file (rules rename upstream files whose names carry the old brand). */
export function rename(rule, from, to) {
  const src = path.join(root, from);
  const dest = path.join(root, to);
  if (!fs.existsSync(src)) {
    if (!fs.existsSync(dest))
      failures.push(`${rule}: ${from} no longer exists`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
  // Drop directories the move left empty.
  for (
    let dir = path.dirname(src);
    dir !== root && fs.readdirSync(dir).length === 0;

  ) {
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
  renamed.set(from, to);
  count(rule);
  changedFiles++;
}
