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

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  execFile: execFileMock,
}));
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({ get: getSetting }),
  },
}));

import {
  installAndUpdateMariaDbPlugin,
  mariaDbPluginSettled,
  PLUGIN_VERSION_KEY,
} from './mariadbPlugin.js';

describe('installAndUpdateMariaDbPlugin', () => {
  let home: string;
  let extensionPath: string;
  let bundledDir: string;
  let state: Map<string, unknown>;
  let context: vscode.ExtensionContext;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'mariadb-plugin-'));
    vi.stubEnv('MARIADB_SHELL_AGENT_HOME', home);
    extensionPath = path.join(home, 'vsix');
    bundledDir = path.join(extensionPath, 'dist', 'mariadb-dev-plugin');
    fs.mkdirSync(path.join(bundledDir, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(
      path.join(bundledDir, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ name: 'dev', version: '26.11.0' }),
    );
    state = new Map();
    context = {
      extensionPath,
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
    execFileMock.mockImplementation((_file, _args, _options, callback) =>
      callback(null, { stdout: '', stderr: '' }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(home, { recursive: true, force: true });
  });

  function installExtension(name: string, metadata: object) {
    const dir = path.join(home, 'extensions', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.qwen-extension-install.json'),
      JSON.stringify(metadata),
    );
  }

  function cliCalls() {
    return execFileMock.mock.calls.map(([, args]) => args.slice(1));
  }

  async function run() {
    installAndUpdateMariaDbPlugin(context, 'cli.js');
    await mariaDbPluginSettled();
  }

  it('installs the bundled plugin through the bundled CLI and records its version', async () => {
    await run();
    expect(execFileMock).toHaveBeenCalledWith(
      process.execPath,
      ['cli.js', 'extensions', 'install', bundledDir, '--consent'],
      expect.anything(),
      expect.any(Function),
    );
    expect(state.get(PLUGIN_VERSION_KEY)).toBe('26.11.0');
  });

  it('replaces an installed copy when the bundled version is new', async () => {
    state.set(PLUGIN_VERSION_KEY, '26.10.6');
    installExtension('dev', { type: 'local' });
    await run();
    expect(cliCalls()).toEqual([
      ['extensions', 'uninstall', 'dev'],
      ['extensions', 'install', bundledDir, '--consent'],
    ]);
    expect(state.get(PLUGIN_VERSION_KEY)).toBe('26.11.0');
  });

  it('replaces the plugin 26.11.2 installed from GitHub, which then is no longer updated', async () => {
    state.set('mariadbDevPluginInstalled', true);
    installExtension('dev', { type: 'git', autoUpdate: true });
    await run();
    expect(cliCalls()).toEqual([
      ['extensions', 'uninstall', 'dev'],
      ['extensions', 'install', bundledDir, '--consent'],
    ]);
  });

  it('does not reinstall a plugin the user uninstalled', async () => {
    state.set(PLUGIN_VERSION_KEY, '26.10.6');
    await run();
    state.clear();
    state.set('mariadbDevPluginInstalled', true);
    await run();
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('does not reinstall the version it installed last', async () => {
    state.set(PLUGIN_VERSION_KEY, '26.11.0');
    installExtension('dev', { type: 'local' });
    await run();
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('installs nothing without a bundled plugin', async () => {
    fs.rmSync(bundledDir, { recursive: true });
    await run();
    expect(execFileMock).not.toHaveBeenCalled();
    expect(state.has(PLUGIN_VERSION_KEY)).toBe(false);
  });

  it('does not record a failed install, so the next start retries', async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) =>
      callback(new Error('failed')),
    );
    await run();
    expect(state.has(PLUGIN_VERSION_KEY)).toBe(false);
  });

  it('updates the extensions with auto-update', async () => {
    state.set(PLUGIN_VERSION_KEY, '26.11.0');
    installExtension('other', { source: 'x', autoUpdate: true });
    installExtension('manual', { source: 'y' });
    await run();
    expect(cliCalls()).toEqual([
      ['extensions', 'update', 'other', '--consent'],
    ]);
  });

  it('keeps going when an update fails', async () => {
    state.set(PLUGIN_VERSION_KEY, '26.11.0');
    installExtension('a', { autoUpdate: true });
    installExtension('b', { autoUpdate: true });
    execFileMock.mockImplementationOnce((_file, _args, _options, callback) =>
      callback(new Error('offline')),
    );
    await run();
    expect(cliCalls()).toHaveLength(2);
  });

  it('does nothing when the setting is off', async () => {
    getSetting.mockReturnValue(false);
    installExtension('other', { autoUpdate: true });
    await run();
    expect(execFileMock).not.toHaveBeenCalled();
    expect(state.has(PLUGIN_VERSION_KEY)).toBe(false);
  });
});
