/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

const { execFileMock, getSetting } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
  getSetting: vi.fn(),
}));

vi.mock('node:child_process', () => ({ execFile: execFileMock }));
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({ get: getSetting }),
  },
}));

import {
  installMariaDbPluginOnce,
  mariaDbPluginInstallSettled,
  PLUGIN_INSTALLED_KEY,
} from './mariadbPlugin.js';

describe('installMariaDbPluginOnce', () => {
  let home: string;
  let state: Map<string, unknown>;
  let context: vscode.ExtensionContext;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'mariadb-plugin-'));
    vi.stubEnv('MARIADB_SHELL_AGENT_HOME', home);
    state = new Map();
    context = {
      globalState: {
        get: (key: string) => state.get(key),
        update: async (key: string, value: unknown) => {
          state.set(key, value);
        },
      },
    } as unknown as vscode.ExtensionContext;
    getSetting.mockImplementation(
      (_key: string, fallback: unknown) => fallback,
    );
    execFileMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(home, { recursive: true, force: true });
  });

  function installSucceeds() {
    execFileMock.mockImplementation((_file, _args, _options, callback) =>
      callback(null, '', ''),
    );
  }

  it('installs the plugin through the bundled CLI and records it', async () => {
    installSucceeds();
    installMariaDbPluginOnce(context, '/ext/dist/qwen-cli/cli.js');
    await mariaDbPluginInstallSettled();
    expect(execFileMock).toHaveBeenCalledWith(
      process.execPath,
      [
        '/ext/dist/qwen-cli/cli.js',
        'extensions',
        'install',
        'https://github.com/mariadb/ai-plugins:dev',
        '--consent',
      ],
      expect.anything(),
      expect.any(Function),
    );
    expect(state.get(PLUGIN_INSTALLED_KEY)).toBe(true);
  });

  it('records a plugin that is already installed without reinstalling', async () => {
    fs.mkdirSync(path.join(home, 'extensions', 'dev'), { recursive: true });
    installMariaDbPluginOnce(context, 'cli.js');
    await mariaDbPluginInstallSettled();
    expect(execFileMock).not.toHaveBeenCalled();
    expect(state.get(PLUGIN_INSTALLED_KEY)).toBe(true);
  });

  it('does not record a failed install, so the next start retries', async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) =>
      callback(new Error('offline'), '', ''),
    );
    installMariaDbPluginOnce(context, 'cli.js');
    await mariaDbPluginInstallSettled();
    expect(state.has(PLUGIN_INSTALLED_KEY)).toBe(false);
  });

  it('does nothing once recorded, even when the plugin was uninstalled', async () => {
    state.set(PLUGIN_INSTALLED_KEY, true);
    installMariaDbPluginOnce(context, 'cli.js');
    await mariaDbPluginInstallSettled();
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('does nothing when the setting is off', async () => {
    getSetting.mockReturnValue(false);
    installMariaDbPluginOnce(context, 'cli.js');
    await mariaDbPluginInstallSettled();
    expect(execFileMock).not.toHaveBeenCalled();
    expect(state.has(PLUGIN_INSTALLED_KEY)).toBe(false);
  });
});
