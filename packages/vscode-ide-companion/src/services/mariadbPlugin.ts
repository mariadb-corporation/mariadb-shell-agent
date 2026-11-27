/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { Storage } from '@qwen-code/qwen-code-core';
import { getErrorMessage } from '../utils/errorMessage.js';
import { logger } from '../utils/logger.js';

const PLUGIN_SOURCE = 'https://github.com/mariadb/ai-plugins:dev';
const PLUGIN_NAME = 'dev';
export const PLUGIN_INSTALLED_KEY = 'mariadbDevPluginInstalled';
const INSTALL_TIMEOUT_MS = 60_000;

let pendingInstall: Promise<void> = Promise.resolve();

// The CLI applies MARIADB_SHELL_AGENT_HOME over QWEN_HOME at startup; the
// extension host does not run that alias module.
function userExtensionsDir(): string {
  const home = process.env['MARIADB_SHELL_AGENT_HOME'];
  if (!home) return Storage.getUserExtensionsDir();
  return path.join(
    path.resolve(home.replace(/^~(?=$|[/\\])/, os.homedir())),
    'extensions',
  );
}

async function install(
  context: vscode.ExtensionContext,
  cliEntryPath: string,
): Promise<void> {
  if (!existsSync(path.join(userExtensionsDir(), PLUGIN_NAME))) {
    try {
      await promisify(execFile)(
        process.execPath,
        [cliEntryPath, 'extensions', 'install', PLUGIN_SOURCE, '--consent'],
        {
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
          timeout: INSTALL_TIMEOUT_MS,
        },
      );
      logger.info('Installed the MariaDB dev plugin');
    } catch (error) {
      logger.warn(
        `Installing the MariaDB dev plugin failed; retrying on the next start: ${getErrorMessage(error)}`,
      );
      return;
    }
  }
  await context.globalState.update(PLUGIN_INSTALLED_KEY, true);
}

/**
 * Installs MariaDB's dev plugin once, in the background. A plugin that is
 * already there counts as installed; a failed install is retried on the next
 * activation.
 */
export function installMariaDbPluginOnce(
  context: vscode.ExtensionContext,
  cliEntryPath: string,
): void {
  if (
    context.globalState.get(PLUGIN_INSTALLED_KEY) ||
    !vscode.workspace
      .getConfiguration('mariadb-shell-agent')
      .get<boolean>('installMariaDbPlugin', true)
  ) {
    return;
  }
  pendingInstall = install(context, cliEntryPath).catch((error: unknown) =>
    logger.warn(
      `Recording the MariaDB dev plugin install failed: ${getErrorMessage(error)}`,
    ),
  );
}

/** Settles when the install started by this activation has finished. */
export function mariaDbPluginInstallSettled(): Promise<void> {
  return pendingInstall;
}
