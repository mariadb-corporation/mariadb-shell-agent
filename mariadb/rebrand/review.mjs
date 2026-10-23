/**
 * The /review footer ("_— <model> via MariaDB Code /review (vX)_"). The module writes the footer
 * and parses it back, also in forged, split and re-cased forms (`Qwen<!--Code`, `Qwen\nCode`,
 * `QWEN CODE`), so the whole module, its tests and the autofix workflow that re-implements the
 * footer regex are renamed together. Names joined by a hyphen (`qwen-code`, the `Qwen-Code-CI-Bot`
 * login, `<!-- qwen-review -->` markers) and fixtures naming the QwenLM repository stay.
 */
import {
  CODE_EXTENSIONS,
  STRING_ESCAPE,
  patch,
  replaceInTracked,
} from './lib.mjs';

// "Qwen" followed by "Code" across whitespace, an escaped line break or an HTML-comment splice.
const FOOTER_NAME = new RegExp(
  String.raw`(?:(?<=${STRING_ESCAPE})|\b)(qwen)(?=(?:\s|${STRING_ESCAPE}|<!--?[^>]{0,20}?-)+code\b)`,
  'gi',
);
const BRAND = { Qwen: 'MariaDB', QWEN: 'MARIADB', qwen: 'mariadb' };

export function apply() {
  replaceInTracked(
    'review footer',
    ['packages/cli/src/commands/review', '.github/workflows/qwen-autofix.yml'],
    [[FOOTER_NAME, (name) => BRAND[name] ?? 'MariaDB']],
    { extensions: new Set([...CODE_EXTENSIONS, '.yml']) },
  );
  // A forging test sits exactly on the length cap of a finding's `by` text; "MariaDB" is three
  // characters longer than "Qwen", so the filler shrinks by two `<a` (the span stays over 200).
  patch(
    'review forging test length',
    'packages/cli/src/commands/review/submit.test.ts',
    "${'<a'.repeat(105)} via MariaDB Code /review_ y`",
    "${'<a'.repeat(103)} via MariaDB Code /review_ y`",
    (t) => t.includes("${'<a'.repeat(103)} via MariaDB Code /review_ y`"),
  );
}
