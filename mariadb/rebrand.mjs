#!/usr/bin/env node
/**
 * Applies the MariaDB Code branding to a clean upstream Qwen Code tree.
 *
 *   node mariadb/rebrand.mjs
 *
 * Upstream files are never edited by hand in this fork: this script makes every change, and its
 * result is committed as the single top commit "MariaDB branding (generated)". After a rebase onto
 * upstream that commit is dropped and recreated (mariadb/sync-upstream.sh), so the upstream files
 * never carry conflicting fork edits.
 *
 * Every rule must find its upstream anchor. When upstream moves or rewrites one, the script stops
 * with an error naming the rule instead of silently leaving Qwen branding in the build.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const assets = path.join(here, 'assets');

const PRODUCT = 'MariaDB Code';
const UPSTREAM_PRODUCT = 'Qwen Code';

// Packages that make up the CLI, the VS Code extension (which bundles the CLI) and the daemon's
// Web Shell. Tests and snapshots are rebranded too so they keep matching the source.
const PHRASE_DIRS = [
  'packages/cli',
  'packages/core',
  'packages/acp-bridge',
  'packages/vscode-ide-companion',
  'packages/web-shell',
  'packages/web-templates',
];
const PHRASE_EXTENSIONS = new Set([
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
// Files that only document upstream and are not shipped as product UI.
const PHRASE_SKIP = [
  /(^|\/)CHANGELOG\.md$/,
  /(^|\/)NOTICES\.txt$/,
  /(^|\/)LICENSE$/,
];

const failures = [];
let changedFiles = 0;

function rel(p) {
  return path.relative(root, p);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
  const abs = path.join(root, file);
  if (fs.existsSync(abs) && fs.readFileSync(abs, 'utf8') === content) return;
  fs.writeFileSync(abs, content);
  changedFiles++;
}

function copyAsset(from, to) {
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
function patch(rule, file, pattern, replacement, alreadyDone) {
  const before = read(file);
  const after = before.replace(pattern, replacement);
  if (after === before && !alreadyDone(before)) {
    failures.push(`${rule}: anchor not found in ${file}`);
    return;
  }
  write(file, after);
}

function svgDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

const appIcon = fs.readFileSync(path.join(assets, 'app-icon.svg'), 'utf8');
const sealMono = fs.readFileSync(path.join(assets, 'seal-mono.svg'), 'utf8');

/** Replaces each [from, to] pair in the tracked files under `pathspecs`; returns the files hit. */
function replaceInTracked(pathspecs, pairs) {
  const files = execFileSync('git', ['ls-files', '-z', '--', ...pathspecs], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
    .split('\0')
    .filter(Boolean);
  let hits = 0;
  for (const file of files) {
    if (!PHRASE_EXTENSIONS.has(path.extname(file))) continue;
    if (PHRASE_SKIP.some((re) => re.test(file))) continue;
    const abs = path.join(root, file);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    // Copyright lines are upstream's attribution and stay as they are.
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
  return hits;
}

// 1. Extension identity, so it installs beside upstream's companion and never offers upstream's
//    Marketplace build as an "update". The npm workspace name is the extension name, so build
//    scripts and .pnpmfile.mjs that address the workspace by name are included.
const EXTENSION_ID = 'MariaDB.mariadb-code';
const EXTENSION_NAME = 'mariadb-code';
const identityHits = replaceInTracked(
  ['.', ':!*.md', ':!.github', ':!docs', ':!docs-site'],
  [
    ['qwenlm.qwen-code-vscode-ide-companion', EXTENSION_ID],
    ['qwen-code-vscode-ide-companion', EXTENSION_NAME],
  ],
);
{
  const file = 'packages/vscode-ide-companion/package.json';
  const pkg = JSON.parse(read(file));
  if (pkg.name !== EXTENSION_NAME) {
    failures.push(`extension identity: ${file} is named "${pkg.name}"`);
  }
  Object.assign(pkg, {
    displayName: 'MariaDB Code',
    description: 'MariaDB Code with direct access to your VS Code workspace.',
    publisher: 'MariaDB',
    keywords: [
      'mariadb',
      'mariadb code',
      'ai',
      'agent',
      'cli',
      'ide companion',
    ],
  });
  pkg.repository = {
    ...pkg.repository,
    url: 'https://github.com/mariadb-corporation/mariadb-shell-agent',
  };
  write(file, JSON.stringify(pkg, null, 2) + '\n');
}

// 2. Product name in UI strings, prompts, locales, tests and snapshots.
const phraseHits = replaceInTracked(PHRASE_DIRS, [
  // The tool summary in the deferred-tools reminder is cut at a length budget; the longer name
  // would push "completed tasks are revived" past it.
  ['or another Qwen Code session (use "to")', 'or another session (use "to")'],
  [UPSTREAM_PRODUCT, PRODUCT],
  // Bare "Qwen" naming the agent (not the model family) in visible CLI text.
  ['ask Qwen', `ask ${PRODUCT}`],
  ['How is Qwen doing', `How is ${PRODUCT} doing`],
  ['stdout shown to Qwen', `stdout shown to ${PRODUCT}`],
  ['start coding with Qwen.', `start coding with ${PRODUCT}.`],
  ['开始使用 Qwen 编码', `开始使用 ${PRODUCT} 编码`],
  ['`Qwen - ${', `\`${PRODUCT} - \${`],
]);

write(
  'packages/vscode-ide-companion/README.md',
  fs.readFileSync(path.join(here, 'vscode-extension', 'README.md'), 'utf8'),
);

// 3. Extension icons (marketplace / tab icon, attention-dot variants, activity bar).
copyAsset('icon.png', 'packages/vscode-ide-companion/assets/icon.png');
copyAsset(
  'icon-orange.png',
  'packages/vscode-ide-companion/assets/icon-orange.png',
);
copyAsset(
  'icon-blue.png',
  'packages/vscode-ide-companion/assets/icon-blue.png',
);
copyAsset(
  'seal-mono.svg',
  'packages/vscode-ide-companion/assets/sidebar-icon.svg',
);

// 4. Web Shell: PWA icons, notification icon, favicon and the sidebar brand mark.
copyAsset('app-icon.svg', 'packages/web-shell/client/public/assets/icon.svg');
copyAsset(
  'icon-192.png',
  'packages/web-shell/client/public/assets/icon-192.png',
);
copyAsset(
  'icon-512.png',
  'packages/web-shell/client/public/assets/icon-512.png',
);
copyAsset(
  'notification.png',
  'packages/web-shell/client/assets/qwen-code-notification.png',
);
patch(
  'web-shell favicon',
  'packages/web-shell/client/index.html',
  /(<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href=")data:image\/svg\+xml,[^"]*(")/,
  (_, a, b) => a + svgDataUri(appIcon) + b,
  (t) => t.includes(svgDataUri(appIcon)),
);
{
  const inner = appIcon.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const jsx = `function IconQwenLogo() {\n  return (\n    <svg viewBox="0 0 1204 1204" aria-hidden="true">\n      ${inner.replaceAll('fill-rule', 'fillRule')}\n    </svg>\n  );\n}`;
  patch(
    'web-shell sidebar logo',
    'packages/web-shell/client/components/sidebar/WebShellSidebar.tsx',
    /function IconQwenLogo\(\) \{\n {2}return \(\n {4}<svg viewBox="17\.5 27\.7 135\.6 135\.6"[\s\S]*?<\/svg>\n {2}\);\n\}/,
    () => jsx,
    (t) => t.includes(jsx),
  );
}

// Tests that pin the built-in artwork follow it.
patch(
  'web-shell sidebar logo test',
  'packages/web-shell/client/components/sidebar/WebShellSidebar.brand.test.tsx',
  `container.querySelector('svg[viewBox="17.5 27.7 135.6 135.6"]')`,
  `container.querySelector('svg[viewBox="0 0 1204 1204"]')`,
  (t) => t.includes(`svg[viewBox="0 0 1204 1204"]`),
);
patch(
  'web-shell favicon test',
  'packages/web-shell/client/index-html.test.ts',
  "expect(href).toContain('%23082DFF');",
  "expect(href).toContain('%23003545');",
  (t) => t.includes("expect(href).toContain('%23003545');"),
);

// 5. Favicon of exported HTML transcripts.
{
  const file = 'packages/web-templates/src/export-html/src/favicon.svg';
  if (!fs.existsSync(path.join(root, file)))
    failures.push(`export favicon: ${file} is gone`);
  else write(file, sealMono.replace('fill="currentColor"', 'fill="#003545"'));
}

// 6. Terminal banner logo.
{
  const file = 'packages/cli/src/ui/components/AsciiArt.ts';
  const logo = fs.readFileSync(path.join(assets, 'ascii-logo.txt'), 'utf8');
  patch(
    'ascii logo',
    file,
    /(export const shortAsciiLogo = `)[\s\S]*?(`;)/,
    (_, a, b) => a + logo + b,
    (t) => t.includes(logo),
  );
}

if (phraseHits === 0) {
  console.log(
    `note: no "${UPSTREAM_PRODUCT}" left to replace (tree already branded?)`,
  );
}
if (failures.length) {
  console.error(
    'rebrand failed; adapt mariadb/rebrand.mjs to the new upstream code:',
  );
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `rebrand: ${changedFiles} files changed (${phraseHits} with product-name strings, ${identityHits} with the extension id)`,
);
