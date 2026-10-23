/**
 * The /review footer ("_— <model> via MariaDB Code /review (vX)_"). The module writes the footer
 * and parses it back (also in forged, split forms such as `Qwen<!--Code` or `Qwen\nCode`), so
 * the whole module and its tests are renamed together. Fixtures naming the QwenLM/qwen-code
 * repository stay as they are.
 */
import { replaceInTracked } from './lib.mjs';

export function apply() {
  replaceInTracked(
    'review footer',
    ['packages/cli/src/commands/review'],
    [[/\bQwen(?!LM|\w| Team)/g, 'MariaDB']],
  );
}
