/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Upstream tests whose expectations depend on how long "Qwen Code" is: where a sentence naming it
 * wraps, or whether a table header fits. "MariaDB Shell Agent" is ten characters longer, so these
 * expectations follow the longer name. Runs after product-name.mjs, on its output.
 */
import { patch } from './lib.mjs';

export function apply() {
  // The dialog wraps after "restart Qwen" upstream and after "restart MariaDB" here.
  const trustDialog =
    'packages/cli/src/ui/components/IdeTrustChangeDialog.test.tsx';
  patch(
    'name length',
    trustDialog,
    "toContain('Code and apply the changes.')",
    "toContain('Shell Agent and apply the changes.')",
    (t) => t.includes("toContain('Shell Agent and apply the changes.')"),
  );
  patch(
    'name length',
    trustDialog,
    `toContain("Press 'r' to restart MariaDB Shell Agent")`,
    `toContain("Press 'r' to restart MariaDB")`,
    (t) => t.includes(`toContain("Press 'r' to restart MariaDB")`),
  );

  // A 50-column table: with the longer header, "Claude Code" no longer fits on one line. The
  // header is sample data, so a name as short as upstream's keeps the test's point.
  const table = 'packages/cli/src/ui/utils/TableRenderer.test.tsx';
  for (const [from, to] of [
    [
      "['对比项', 'Claude Code', 'MariaDB Shell Agent']",
      "['对比项', 'Claude Code', 'MariaDB']",
    ],
    [
      "expect(output).toContain('MariaDB Shell Agent');",
      "expect(output).toContain('MariaDB');",
    ],
  ]) {
    patch('name length', table, from, to, (t) => t.includes(to));
  }

  // The settings dialog's restart prompt names the product; it fills two rows instead of one, so
  // the list window shrinks to the one row that follows the selection (the second setting).
  patch(
    'name length',
    'packages/cli/src/ui/opentui/dialogs-modes.test.tsx',
    `    expect(screen.getByText(items[0]!.label)).not.toBeNull();
    expect(screen.getByText(items[1]!.label)).not.toBeNull();
    expect(screen.queryByText(items[2]!.label)).toBeNull();`,
    `    expect(screen.queryByText(items[0]!.label)).toBeNull();
    expect(screen.getByText(items[1]!.label)).not.toBeNull();
    expect(screen.queryByText(items[2]!.label)).toBeNull();`,
    (t) =>
      t.includes(`    expect(screen.queryByText(items[0]!.label)).toBeNull();
    expect(screen.getByText(items[1]!.label)).not.toBeNull();
    expect(screen.queryByText(items[2]!.label)).toBeNull();`),
  );

  // The bundled skills' descriptions name the product several times, so their listing in the
  // prompt grows with the name; the budget grows by the same amount.
  patch(
    'name length',
    'packages/core/src/skills/bundled-skills.integration.test.ts',
    'const BUNDLED_LISTING_BUDGET = 6_800;',
    'const BUNDLED_LISTING_BUDGET = 6_900;',
    (t) => t.includes('const BUNDLED_LISTING_BUDGET = 6_900;'),
  );
}
