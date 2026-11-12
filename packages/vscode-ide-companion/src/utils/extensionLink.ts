/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as vscode from 'vscode';
import { logger } from './logger.js';

/**
 * Opens links into the MariaDB VS Code extension (`MariaDB.mariadb-shell`) that
 * agents put in their answers, such as
 * `vscode://mariadb.mariadb-shell/msm/openDiagram?project=…&diagram=…`.
 *
 * The agent writes `vscode://` because it can't know the host editor's URI
 * scheme, so the scheme is replaced with the editor's own (`vscode`,
 * `vscode-insiders`, a Theia app's `electron.uriScheme`), which routes the link
 * to the extension's URI handler. Only this authority is opened, and when no
 * handler is registered for it (the extension is missing or too old) the click
 * does nothing; there is deliberately no other way of opening the link.
 */
const EXTENSION_LINK_AUTHORITY = 'mariadb.mariadb-shell';

const EXTENSION_LINK =
  /^[a-z][a-z0-9+.-]*:\/\/mariadb\.mariadb-shell(?=[/?#]|$)/i;

/**
 * The link with the editor's scheme and the authority in lower case (handlers
 * are looked up by the lower-case extension id), the rest kept byte for byte.
 * `null` for any other link.
 */
export function rewriteExtensionLink(
  url: string,
  uriScheme: string,
): string | null {
  const trimmed = url.trim();
  const match = EXTENSION_LINK.exec(trimmed);
  if (!match) return null;
  return `${uriScheme}://${EXTENSION_LINK_AUTHORITY}${trimmed.slice(match[0].length)}`;
}

let theiaHost: Promise<boolean> | undefined;

/**
 * Theia's `env.openExternal` gives a URI with the app's own scheme to the
 * operating system rather than to the plugin's URI handler, while `vscode.open`
 * goes through Theia's opener service, where the handler is. VS Code's
 * `openExternal` handles its own scheme in the app. `core.about` is a command
 * of Theia's core and not one of VS Code's.
 */
function isTheiaHost(): Promise<boolean> {
  theiaHost ??= Promise.resolve(vscode.commands.getCommands()).then(
    (commands) => commands.includes('core.about'),
    () => false,
  );
  return theiaHost;
}

export async function openExtensionLink(url: string): Promise<void> {
  const target = rewriteExtensionLink(url, vscode.env.uriScheme);
  if (!target) {
    logger.warn('[extensionLink] Not a MariaDB extension link:', url);
    return;
  }
  const uri = vscode.Uri.parse(target);
  try {
    if (await isTheiaHost()) {
      await vscode.commands.executeCommand('vscode.open', uri);
    } else {
      await vscode.env.openExternal(uri);
    }
  } catch (error) {
    logger.error('[extensionLink] Failed to open', target, error);
  }
}

/** For tests: forget the detected host. */
export function resetExtensionLinkHostForTesting(): void {
  theiaHost = undefined;
}
