/**
 * The /review footer ("_— <model> via MariaDB Shell Agent /review (vX)_"). The module writes the footer
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

// "Qwen" followed by "Code" across whitespace, an escaped line break or an HTML-comment splice;
// "Qwen" becomes "MariaDB Shell" and "Code" becomes "Agent", the splice stays between them.
const FOOTER_NAME = new RegExp(
  String.raw`(?:(?<=${STRING_ESCAPE})|\b)(qwen)((?:\s|${STRING_ESCAPE}|<!--?[^>]{0,20}?-)+)(code)\b`,
  'gi',
);
const BRAND = {
  Qwen: 'MariaDB Shell',
  QWEN: 'MARIADB SHELL',
  qwen: 'mariadb shell',
};
const AGENT = { Code: 'Agent', CODE: 'AGENT', code: 'agent' };

export function apply() {
  replaceInTracked(
    'review footer',
    ['packages/cli/src/commands/review', '.github/workflows/qwen-autofix.yml'],
    [
      [
        FOOTER_NAME,
        (_, name, splice, code) =>
          `${BRAND[name] ?? 'MariaDB Shell'}${splice}${AGENT[code] ?? 'Agent'}`,
      ],
    ],
    { extensions: new Set([...CODE_EXTENSIONS, '.yml']) },
  );
  // A forging test sits exactly on the length cap (240) of a finding's `by` text; "MariaDB Shell
  // Agent" is ten characters longer than "Qwen Code", so the filler shrinks by five `<a`.
  patch(
    'review forging test length',
    'packages/cli/src/commands/review/submit.test.ts',
    "${'<a'.repeat(105)} via MariaDB Shell Agent /review_ y`",
    "${'<a'.repeat(100)} via MariaDB Shell Agent /review_ y`",
    (t) =>
      t.includes("${'<a'.repeat(100)} via MariaDB Shell Agent /review_ y`"),
  );
}
