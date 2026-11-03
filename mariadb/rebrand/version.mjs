/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Product version: the shipped packages carry the fork's own version (mariadb/VERSION), set only
 * while mariadb/build-vsix.sh builds them. The sources keep upstream's version, so the workspace,
 * the lockfile and the tests are unchanged; without MARIADB_FORK_VERSION both build scripts behave
 * as upstream's.
 */
import { patch } from './lib.mjs';

const ENV = "process.env['MARIADB_FORK_VERSION']";

export function apply() {
  // The CLI bundle reports the version esbuild bakes in.
  patch(
    'version',
    'esbuild.config.js',
    "'process.env.CLI_VERSION': JSON.stringify(pkg.version),",
    `'process.env.CLI_VERSION': JSON.stringify(${ENV} || pkg.version),`,
    (s) => s.includes(ENV),
  );
  // The bundled CLI's package.json; its native optional dependencies (audio-capture) keep the
  // upstream version they are published under.
  patch(
    'version',
    'scripts/prepare-package.js',
    '    version: rootPackageJson.version,\n',
    `    version: ${ENV} || rootPackageJson.version,\n`,
    (s) => s.includes(ENV),
  );
}
