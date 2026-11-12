/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const vscodeMock = vi.hoisted(() => ({
  env: {
    uriScheme: 'vscode',
    openExternal: vi.fn(async () => true),
  },
  commands: {
    getCommands: vi.fn(async (): Promise<string[]> => []),
    executeCommand: vi.fn(async () => undefined),
  },
  Uri: { parse: vi.fn((value: string) => ({ parsed: value })) },
}));

vi.mock('vscode', () => vscodeMock);

import {
  openExtensionLink,
  resetExtensionLinkHostForTesting,
  rewriteExtensionLink,
} from './extensionLink.js';

const LINK =
  'vscode://mariadb.mariadb-shell/msm/openDiagram?project=%2Ftmp%2Fa%26b%3Dc&diagram=my%20diagram';

describe('rewriteExtensionLink', () => {
  it('puts in the editor scheme and keeps the rest byte for byte', () => {
    expect(rewriteExtensionLink(LINK, 'theia')).toBe(
      'theia://mariadb.mariadb-shell/msm/openDiagram?project=%2Ftmp%2Fa%26b%3Dc&diagram=my%20diagram',
    );
    expect(rewriteExtensionLink(LINK, 'vscode-insiders')).toBe(
      LINK.replace('vscode:', 'vscode-insiders:'),
    );
  });

  it('lower-cases the authority', () => {
    expect(
      rewriteExtensionLink('VSCODE://MariaDB.Mariadb-Shell/x?a=B', 'vscode'),
    ).toBe('vscode://mariadb.mariadb-shell/x?a=B');
  });

  it('rejects every other authority', () => {
    for (const url of [
      'vscode://other.extension/x',
      'vscode://mariadb.mariadb-shell-agent/x',
      'vscode://mariadb.mariadb-shell.evil/x',
      'vscode://user@mariadb.mariadb-shell/x',
      'https://example.com/?u=vscode://mariadb.mariadb-shell/x',
      'mariadb.mariadb-shell/x',
    ]) {
      expect(rewriteExtensionLink(url, 'vscode')).toBeNull();
    }
  });
});

describe('openExtensionLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetExtensionLinkHostForTesting();
  });

  it('opens it externally in VS Code', async () => {
    vscodeMock.env.uriScheme = 'vscode-insiders';
    vscodeMock.commands.getCommands.mockResolvedValue([
      'workbench.action.showAboutDialog',
    ]);
    await openExtensionLink(LINK);
    const expected = LINK.replace('vscode:', 'vscode-insiders:');
    expect(vscodeMock.Uri.parse).toHaveBeenCalledWith(expected);
    expect(vscodeMock.env.openExternal).toHaveBeenCalledWith({
      parsed: expected,
    });
    expect(vscodeMock.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('opens it with vscode.open in Theia', async () => {
    vscodeMock.env.uriScheme = 'theia';
    vscodeMock.commands.getCommands.mockResolvedValue(['core.about']);
    await openExtensionLink(LINK);
    expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
      'vscode.open',
      { parsed: LINK.replace('vscode:', 'theia:') },
    );
    expect(vscodeMock.env.openExternal).not.toHaveBeenCalled();
  });

  it('opens nothing for another link', async () => {
    await openExtensionLink('vscode://other.extension/run');
    expect(vscodeMock.env.openExternal).not.toHaveBeenCalled();
    expect(vscodeMock.commands.executeCommand).not.toHaveBeenCalled();
  });
});
