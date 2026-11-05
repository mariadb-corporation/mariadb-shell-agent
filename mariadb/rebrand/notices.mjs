/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Third-party notices. mariadb/THIRD-PARTY-NOTICES.txt (written by mariadb/generate-notices.mjs,
 * which needs node_modules and so cannot run here) goes to the repository root and into the
 * extension as NOTICES.txt, the file the .vsix ships (the MariaDB Shell Workbench lists the
 * extension's license files by that name). Upstream's generator walks the extension's dependencies
 * only and would overwrite NOTICES.txt without the bundled CLI's packages when the extension is
 * packaged (prepackage.js runs `generate:notices`), so that script verifies our file instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { mariadbDir, patch, patchJson, write } from './lib.mjs';

export function apply() {
  const notices = fs.readFileSync(
    path.join(mariadbDir, 'THIRD-PARTY-NOTICES.txt'),
    'utf8',
  );
  write('THIRD-PARTY-NOTICES.txt', notices);
  write('packages/vscode-ide-companion/NOTICES.txt', notices);

  patchJson('notices', 'packages/vscode-ide-companion/package.json', (pkg) => {
    if (!pkg.scripts?.['generate:notices']) return false;
    pkg.scripts['generate:notices'] =
      'node ../../mariadb/generate-notices.mjs --check';
  });

  patch(
    'notices',
    '.gitattributes',
    /^packages\/vscode-ide-companion\/NOTICES\.txt linguist-generated=true\n/m,
    '$&THIRD-PARTY-NOTICES.txt linguist-generated=true\n',
    (s) => s.includes('THIRD-PARTY-NOTICES.txt linguist-generated'),
  );
}
