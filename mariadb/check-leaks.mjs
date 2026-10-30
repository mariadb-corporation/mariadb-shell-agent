#!/usr/bin/env node
/**
 * Finds upstream branding and Alibaba endpoints that the rebrand rules did not catch.
 *
 *   node mariadb/check-leaks.mjs                 # the branded source (shipped packages, user docs)
 *   node mariadb/check-leaks.mjs <dir|.vsix>...  # build output, e.g. dist/ or a packaged .vsix
 *
 * Exits 1 when something is found that mariadb/leak-allowlist.json does not explain. New upstream
 * code that names an old path or host then fails the sync that brought it in.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DOCS_DIRS, SHIPPED_DIRS, root, trackedFiles } from './rebrand/lib.mjs';

const CHECKS = [
  {
    id: 'alibaba-host',
    re: /(?<![A-Za-z0-9-])(?:aliyuncs|aliyun|aliyun-inc|alibabacloud|alibaba-inc|alibaba|alicdn|qwencloud|qwencloudapi)\\{0,2}\.com\b|(?<![A-Za-z0-9-])(?:qwen|modelscope)\\{0,2}\.(?:ai|com|cn)\b/gi,
  },
  {
    id: 'qwenlm-url',
    re: /github\\{0,2}\.com\\{0,2}\/QwenLM\b|qwenlm\\{0,2}\.github\\{0,2}\.io|ghcr\\{0,2}\.io\\{0,2}\/qwenlm\b|raw\\{0,2}\.githubusercontent\\{0,2}\.com\\{0,2}\/QwenLM\b/gi,
  },

  {
    id: 'config-dir',
    re: /(?:(?<=\$\d|%2F|\\[nt]!?|\s-[A-Za-z])|(?<![\w.\-?)\]])(?<![\w)\]]!))\.(?:qwen|QWEN)(?![\w-])/g,
  },
  {
    id: 'context-file',
    re: /\b(?:qwen|QWEN)(?:\\{0,2}\.(?:local|LOCAL))?\\{0,2}\.(?:md|MD)\b/g,
  },
  { id: 'ignore-file', re: /\.qwenignore\b/g },
  {
    id: 'regex-alternation',
    re: /\((?:[\w-]+\|)*(?:qwen|QWEN)(?:\|[\w-]+)*\)\\\.(?:md|MD)|\\\.\((?:[\w-]+\|)*qwen(?:\|[\w-]+)*\)/g,
  },
  { id: 'product-name', re: /\bQwen Code\b/g },
  // The fork's former name (MariaDB Code, mariadb-code / mdbc, ~/.mariadb-code, MARIADB_CODE_*).
  {
    id: 'former-name',
    re: /\bMariaDB ?Code\b|\bmariadb-code\b|\bMARIADB[-_]CODE\b|\bmdbc\b/gi,
  },
  {
    // Identifiers sent to other parties (User-Agent, MCP client name, analytics app id) and the
    // system-wide settings paths.
    id: 'outbound-identity',
    re: /\bQwenCode(?=\/|-Preconnect)|qwen-cli-mcp-client|\/etc\/qwen-code|Application Support\/QwenCode|ProgramData\\{1,2}qwen-code|gb4w8c3ygj/g,
  },
];

const TEXT_EXT =
  /\.(?:[cm]?[jt]sx?|json|html|md|mdx|css|snap|webmanifest|txt|sh|ps1|ya?ml)$/;
const allowlist = JSON.parse(
  fs.readFileSync(path.join(root, 'mariadb', 'leak-allowlist.json'), 'utf8'),
).map((a) => ({
  ...a,
  fileRe: new RegExp(a.file),
  textRe: a.text ? new RegExp(a.text) : null,
}));

function allowed(check, file, line) {
  return allowlist.some(
    (a) =>
      a.check === check &&
      a.fileRe.test(file) &&
      (!a.textRe || a.textRe.test(line)),
  );
}

function listFiles(target) {
  if (target.endsWith('.vsix')) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mariadb-leaks-'));
    execFileSync('unzip', ['-q', target, '-d', dir]);
    return listFiles(dir).map((f) => ({
      ...f,
      label: `${path.basename(target)}:${path.relative(dir, f.abs)}`,
    }));
  }
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (TEXT_EXT.test(e.name) && !e.name.endsWith('.map'))
        out.push({ abs, label: path.relative(root, abs) });
    }
  };
  walk(path.resolve(target));
  return out;
}

const targets = process.argv.slice(2);
const files = targets.length
  ? targets.flatMap(listFiles)
  : trackedFiles([...SHIPPED_DIRS, ...DOCS_DIRS])
      .filter((f) => TEXT_EXT.test(f) && fs.existsSync(path.join(root, f)))
      .map((f) => ({ abs: path.join(root, f), label: f }));

const found = new Map(CHECKS.map((c) => [c.id, []]));
for (const { abs, label } of files) {
  const text = fs.readFileSync(abs, 'utf8');
  for (const check of CHECKS) {
    check.re.lastIndex = 0;
    if (!check.re.test(text)) continue;
    text.split('\n').forEach((line, i) => {
      check.re.lastIndex = 0;
      if (!check.re.test(line) || /copyright/i.test(line)) return;
      if (allowed(check.id, label, line)) return;
      found
        .get(check.id)
        .push(`${label}:${i + 1}: ${line.trim().slice(0, 160)}`);
    });
  }
}

let total = 0;
for (const [id, hits] of found) {
  total += hits.length;
  console.log(`${hits.length ? '✗' : '✓'} ${id}: ${hits.length}`);
  for (const h of hits.slice(0, 15)) console.log(`    ${h}`);
  if (hits.length > 15) console.log(`    … ${hits.length - 15} more`);
}
console.log(`${files.length} files scanned`);
process.exit(total ? 1 : 0);
