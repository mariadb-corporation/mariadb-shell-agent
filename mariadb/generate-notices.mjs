#!/usr/bin/env node
/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Writes mariadb/THIRD-PARTY-NOTICES.txt: the third-party npm packages the VS Code extension
 * ships, with their license texts. The rebrand (rebrand/notices.mjs) copies the file to the
 * repository root and to packages/vscode-ide-companion/NOTICES.txt, which goes into the .vsix.
 *
 *   node mariadb/generate-notices.mjs            # regenerate (after a sync or a dependency change)
 *   node mariadb/generate-notices.mjs --check    # fail when the committed file is stale (CI, sync, prepackage)
 *
 * Upstream's generator (packages/vscode-ide-companion/scripts/generate-notices.js) walks the
 * extension's dependencies only; the CLI bundle the extension carries (dist/qwen-cli/cli.js and
 * its chunks, built from packages/cli) adds some 180 packages it never lists. This script walks
 * both trees with upstream's exported helpers, so the license lookup (license and NOTICE files,
 * a package's licenses/ directory, the MIT fallback, ExcelJS's browser bundle) stays upstream's,
 * and prints the result grouped by distinct license text, as the MariaDB Shell Workbench does.
 * Needs node_modules installed (corepack pnpm install --frozen-lockfile).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectDependencies,
  findLicenseFile,
  findNoticeFile,
  findSupplementaryLicenseFiles,
  getExceljsBrowserNotices,
  getFallbackLicenseText,
  normalizeRepositoryUrl,
} from '../packages/vscode-ide-companion/scripts/generate-notices.js';

const mariadbDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(mariadbDir, '..');
const OUTPUT = path.join(mariadbDir, 'THIRD-PARTY-NOTICES.txt');
const upstreamScripts = path.join(
  root,
  'packages/vscode-ide-companion/scripts',
);
/** The packages whose dependencies the .vsix bundles: the extension and the CLI it carries. */
const SEEDS = ['packages/vscode-ide-companion', 'packages/cli'];
const RULE = '='.repeat(78);
const PRODUCT = 'MariaDB Shell Agent';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const lf = (text) => text.replace(/\r\n/g, '\n').trim();

function declaredLicense(manifest) {
  if (typeof manifest.license === 'string') return manifest.license;
  if (manifest.license?.type) return manifest.license.type;
  if (Array.isArray(manifest.licenses))
    return manifest.licenses.map((l) => l.type ?? l).join(' OR ');
  return 'UNKNOWN';
}

/**
 * A package that ships no license file gets its project's text from
 * mariadb/licenses/npm/<name with + for />@<version>, when we added one.
 */
function suppliedLicense(name, version) {
  const file = path.join(
    mariadbDir,
    'licenses/npm',
    `${name.replace(/\//g, '+')}@${version}`,
  );
  return fs.existsSync(file) ? lf(fs.readFileSync(file, 'utf8')) : undefined;
}

/** The license text of an installed package, as upstream's getDependencyLicense assembles it. */
async function licenseText(name, version, dir, manifest) {
  const sections = [];
  const licenseFile = await findLicenseFile(dir, manifest.licenseFile);
  // Upstream's candidate list misses spellings such as LICENSE.MIT and LICENSE.EUPL-1.2 (a dual
  // license, one file each): take every license-like file then, as the Workbench does.
  const licenseFiles = licenseFile
    ? [licenseFile]
    : fs
        .readdirSync(dir)
        .filter(
          (f) =>
            /^(licen[cs]e|copying)([-._].*)?$/i.test(f) &&
            fs.statSync(path.join(dir, f)).isFile(),
        )
        .sort()
        .map((f) => path.join(dir, f));
  if (licenseFiles.length) {
    sections.push(
      licenseFiles
        .map((f) => lf(fs.readFileSync(f, 'utf8')))
        .join(`\n\n${'-'.repeat(78)}\n\n`),
    );
  } else {
    const fallback =
      suppliedLicense(name, version) ??
      getFallbackLicenseText(manifest.license, manifest.author);
    if (!fallback) return undefined;
    sections.push(fallback);
  }
  // pako 1.0.11's LICENSE omits the zlib header of lib/zlib/inflate.js (upstream keeps a copy).
  if (name === 'pako' && version === '1.0.11')
    sections.push(
      `--- lib/zlib/inflate.js (Zlib) ---\n\n${lf(
        fs.readFileSync(
          path.join(upstreamScripts, 'licenses/pako-1.0.11-zlib.txt'),
          'utf8',
        ),
      )}`,
    );
  for (const file of await findSupplementaryLicenseFiles(dir))
    sections.push(
      `--- ${path.relative(dir, file).split(path.sep).join('/')} ---\n\n${lf(
        fs.readFileSync(file, 'utf8'),
      )}`,
    );
  const noticeFile = await findNoticeFile(dir);
  if (noticeFile) {
    const notice = lf(fs.readFileSync(noticeFile, 'utf8'));
    if (notice) sections.push(`--- NOTICE ---\n\n${notice}`);
  }
  return sections.join('\n\n');
}

async function generate() {
  // Packages collectDependencies cannot find are warnings upstream; here the file is wrong then.
  const warnings = [];
  const warn = console.warn;
  console.warn = (message) => warnings.push(message);
  const found = new Map();
  const visited = new Set();
  try {
    for (const seed of SEEDS) {
      const dir = path.join(root, seed);
      for (const dep of Object.keys(
        readJson(path.join(dir, 'package.json')).dependencies ?? {},
      ))
        await collectDependencies(dep, dir, found, visited);
    }
  } finally {
    console.warn = warn;
  }
  if (warnings.length) throw new Error(warnings.join('\n'));

  const packages = [];
  for (const { name, version, dir } of found.values()) {
    const manifest = readJson(path.join(dir, 'package.json'));
    packages.push({
      name,
      version,
      license: declaredLicense(manifest),
      repository: normalizeRepositoryUrl(manifest.repository)?.replace(
        /\.git$/,
        '',
      ),
      text: await licenseText(name, version, dir, manifest),
    });
  }
  // ExcelJS's prebuilt browser bundle embeds packages its package.json does not depend on.
  const exceljs = [...found.values()].find(({ name }) => name === 'exceljs');
  if (exceljs)
    for (const embedded of await getExceljsBrowserNotices(exceljs.dir)) {
      if (found.has(`${embedded.name}@${embedded.version}`)) continue;
      packages.push({
        name: embedded.name,
        version: embedded.version,
        license: embedded.licenseId ?? 'see license text',
        repository: embedded.repository,
        text: lf(embedded.license),
        embeddedIn: 'exceljs',
      });
    }
  packages.sort(
    (a, b) =>
      a.name.localeCompare(b.name) ||
      a.version.localeCompare(b.version, undefined, { numeric: true }),
  );

  const label = (p) =>
    `${p.name} ${p.version}${p.embeddedIn ? ` (in ${p.embeddedIn})` : ''}`;
  const byText = new Map();
  const withoutText = [];
  for (const p of packages)
    if (p.text === undefined) withoutText.push(p);
    else (byText.get(p.text) ?? byText.set(p.text, []).get(p.text)).push(p);

  const out = [];
  out.push(`Third-Party Notices

${PRODUCT}
${RULE}

${PRODUCT} is released under the Apache License 2.0; see LICENSE. It is a
fork of Qwen Code (https://github.com/QwenLM/qwen-code, Apache-2.0) and ships
the third-party npm packages below, each under its own license: the packages
bundled into the command-line interface (dist/qwen-cli/cli.js and its chunks),
the Web Shell and the VS Code extension. The Generated UI runtime the CLI
carries (generated-ui/) comes with its own THIRD_PARTY_NOTICES.txt. A build for
one host installs its optional native packages (node-pty, audio capture,
clipboard, sharp) into dist/qwen-cli/node_modules with their own license files;
the universal build leaves them out.

In the VS Code extension this file is NOTICES.txt, next to LICENSE.txt. The
${PRODUCT} source code keeps it as THIRD-PARTY-NOTICES.txt and regenerates
it with mariadb/generate-notices.mjs.

npm packages

   Each package with the license it declares (a package ExcelJS's browser
   bundle embeds is marked with it). Their license texts follow, one section
   per distinct text.

${packages.map((p) => `   - ${label(p)}: ${p.license}`).join('\n')}
`);
  for (const [text, pkgs] of byText)
    out.push(`${RULE}
${pkgs.map(label).join(', ')}
${[...new Set(pkgs.map((p) => p.repository).filter(Boolean))].join('\n')}
${RULE}

${text}
`);
  if (withoutText.length)
    out.push(`${RULE}
Packages without a license file of their own (license as declared in package.json)
${RULE}

${withoutText.map((p) => `   - ${label(p)}: ${p.license}`).join('\n')}
`);
  return {
    text: out.join('\n').replace(/[ \t]+$/gm, ''),
    packages: packages.length,
    texts: byText.size,
  };
}

const { text, packages, texts } = await generate();
const summary = `${packages} packages, ${texts} license texts`;
if (process.argv.includes('--check')) {
  const committed = fs.existsSync(OUTPUT)
    ? fs.readFileSync(OUTPUT, 'utf8')
    : '';
  if (committed !== text) {
    console.error(
      `${path.relative(root, OUTPUT)} is stale (${summary} installed): run node mariadb/generate-notices.mjs and commit it.`,
    );
    process.exit(1);
  }
  console.log(`${path.relative(root, OUTPUT)} is current (${summary}).`);
} else {
  fs.writeFileSync(OUTPUT, text);
  console.log(`${path.relative(root, OUTPUT)}: ${summary}`);
}
