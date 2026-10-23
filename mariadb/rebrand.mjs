#!/usr/bin/env node
/**
 * Applies the MariaDB Code branding to a clean upstream Qwen Code tree.
 *
 *   node mariadb/rebrand.mjs
 *
 * Upstream files are never edited by hand in this fork: the rules in mariadb/rebrand/ make every
 * change, and the result is committed as the single top commit "MariaDB branding (generated)".
 * After a rebase onto upstream that commit is dropped and recreated (mariadb/sync-upstream.sh),
 * so the upstream files never carry conflicting fork edits.
 *
 * Every rule must find its upstream anchor. When upstream moves or rewrites one, the script stops
 * with an error naming the rule instead of silently leaving Qwen branding in the build.
 */
import { changed, failures, stats } from './rebrand/lib.mjs';
import * as patches from './rebrand/patches.mjs';
import * as identity from './rebrand/identity.mjs';
import * as productName from './rebrand/product-name.mjs';
import * as artwork from './rebrand/artwork.mjs';
import * as alibaba from './rebrand/alibaba.mjs';
import * as paths from './rebrand/paths.mjs';
import * as cliName from './rebrand/cli-name.mjs';
import * as extensionIds from './rebrand/extension-ids.mjs';
import * as review from './rebrand/review.mjs';
import * as outbound from './rebrand/outbound.mjs';
import * as skippedTests from './rebrand/skipped-tests.mjs';

// Order matters where rules overlap: later rules see the output of earlier ones.
for (const rule of [
  patches,
  identity,
  productName,
  artwork,
  alibaba,
  paths,
  cliName,
  extensionIds,
  review,
  outbound,
  skippedTests,
])
  rule.apply();

if (failures.length) {
  console.error(
    'rebrand failed; adapt the rules in mariadb/rebrand/ to the new upstream code:',
  );
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
const detail = [...stats].map(([rule, n]) => `${rule}: ${n}`).join(', ');
console.log(`rebrand: ${changed()} files changed (${detail})`);
