/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { Storage } from '@qwen-code/qwen-code-core';
import { getErrorMessage } from '../utils/errorMessage.js';
import { logger } from '../utils/logger.js';

const PLUGIN_NAME = 'dev';
// Filled by mariadb/build-vsix.sh from mariadb/AI_PLUGINS; missing in a dev build.
const BUNDLED_PLUGIN_DIR = path.join('dist', 'mariadb-dev-plugin');
const INSTALL_METADATA_FILE = '.qwen-extension-install.json';
export const PLUGIN_VERSION_KEY = 'mariadbDevPluginVersion';
// Set by 26.11.2, which installed the plugin from GitHub.
const LEGACY_INSTALLED_KEY = 'mariadbDevPluginInstalled';
const CLI_TIMEOUT_MS = 60_000;

let pending: Promise<void> = Promise.resolve();

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

async function runCli(cliEntryPath: string, args: string[]): Promise<string> {
  const { stdout, stderr } = await promisify(execFile)(
    process.execPath,
    [cliEntryPath, 'extensions', ...args],
    {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      timeout: CLI_TIMEOUT_MS,
    },
  );
  return `${stdout}${stderr}`.trim();
}

function readInstallMetadata(dir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(dir, INSTALL_METADATA_FILE), 'utf8'),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readPluginVersion(dir: string): string | undefined {
  try {
    return (
      JSON.parse(
        fs.readFileSync(
          path.join(dir, '.claude-plugin', 'plugin.json'),
          'utf8',
        ),
      ) as { version?: string }
    ).version;
  } catch {
    return undefined;
  }
}

/**
 * Installs the plugin bundled with this extension when its version differs
 * from the one installed last, replacing an installed copy. A plugin the user
 * uninstalled stays uninstalled.
 */
async function installBundled(
  context: vscode.ExtensionContext,
  cliEntryPath: string,
): Promise<void> {
  const bundledDir = path.join(context.extensionPath, BUNDLED_PLUGIN_DIR);
  const bundled = readPluginVersion(bundledDir);
  const installedVersion = context.globalState.get<string>(PLUGIN_VERSION_KEY);
  if (!bundled || installedVersion === bundled) return;
  const dir = path.join(userExtensionsDir(), PLUGIN_NAME);
  const exists = fs.existsSync(dir);
  const installedBefore =
    installedVersion !== undefined ||
    context.globalState.get(LEGACY_INSTALLED_KEY) === true;
  if (installedBefore && !exists) return;
  try {
    if (exists) await runCli(cliEntryPath, ['uninstall', PLUGIN_NAME]);
    await runCli(cliEntryPath, ['install', bundledDir, '--consent']);
    logger.info(`Installed the MariaDB dev plugin ${bundled}`);
  } catch (error) {
    logger.warn(
      `Installing the MariaDB dev plugin failed; retrying on the next start: ${getErrorMessage(error)}`,
    );
    return;
  }
  await context.globalState.update(PLUGIN_VERSION_KEY, bundled);
}

/** Updates the user's extensions that have auto-update turned on. */
async function updateAutoUpdating(cliEntryPath: string): Promise<void> {
  const root = userExtensionsDir();
  if (!fs.existsSync(root)) return;
  for (const name of fs.readdirSync(root)) {
    if (readInstallMetadata(path.join(root, name))?.['autoUpdate'] !== true) {
      continue;
    }
    try {
      logger.info(await runCli(cliEntryPath, ['update', name, '--consent']));
    } catch (error) {
      logger.warn(
        `Updating extension "${name}" failed; retrying on the next start: ${getErrorMessage(error)}`,
      );
    }
  }
}

/**
 * In the background: installs the MariaDB dev plugin bundled with this
 * extension (a failed install is retried on the next start), then updates the
 * extensions that have auto-update turned on.
 */
export function installAndUpdateMariaDbPlugin(
  context: vscode.ExtensionContext,
  cliEntryPath: string,
): void {
  if (
    !vscode.workspace
      .getConfiguration('mariadb-shell-agent')
      .get<boolean>('installMariaDbPlugin', true)
  ) {
    return;
  }
  pending = (async () => {
    await installBundled(context, cliEntryPath);
    await updateAutoUpdating(cliEntryPath);
  })().catch((error: unknown) =>
    logger.warn(
      `Installing or updating the MariaDB dev plugin failed: ${getErrorMessage(error)}`,
    ),
  );
}

/**
 * Settles when this activation's install and updates have finished, so the
 * daemon and ACP process start with the current plugin.
 */
export function mariaDbPluginSettled(): Promise<void> {
  return pending;
}
