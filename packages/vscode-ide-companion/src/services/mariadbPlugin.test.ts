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
  PLUGIN_INSTALLED_KEY,
} from './mariadbPlugin.js';

const SOURCE = 'https://github.com/mariadb/ai-plugins';

describe('installAndUpdateMariaDbPlugin', () => {
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

  function metadataOf(name: string) {
    return JSON.parse(
      fs.readFileSync(
        path.join(home, 'extensions', name, '.qwen-extension-install.json'),
        'utf8',
      ),
    );
  }

  function cliCalls() {
    return execFileMock.mock.calls.map(([, args]) => args.slice(1));
  }

  async function run() {
    installAndUpdateMariaDbPlugin(context, 'cli.js');
    await mariaDbPluginSettled();
  }

  it('installs the plugin with auto-update through the bundled CLI and records it', async () => {
    await run();
    expect(execFileMock).toHaveBeenCalledWith(
      process.execPath,
      [
        'cli.js',
        'extensions',
        'install',
        `${SOURCE}:dev`,
        '--consent',
        '--auto-update',
      ],
      expect.anything(),
      expect.any(Function),
    );
    expect(state.get(PLUGIN_INSTALLED_KEY)).toBe(true);
  });

  it('turns on auto-update for an installed plugin without reinstalling it', async () => {
    installExtension('dev', { source: SOURCE, type: 'git' });
    await run();
    expect(metadataOf('dev')).toEqual({
      source: SOURCE,
      type: 'git',
      autoUpdate: true,
    });
    expect(cliCalls()).toEqual([['extensions', 'update', 'dev', '--consent']]);
    expect(state.get(PLUGIN_INSTALLED_KEY)).toBe(true);
  });

  it('keeps auto-update off when it was turned off', async () => {
    installExtension('dev', { source: SOURCE, autoUpdate: false });
    await run();
    expect(metadataOf('dev').autoUpdate).toBe(false);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('does not record a failed install, so the next start retries', async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) =>
      callback(new Error('offline')),
    );
    await run();
    expect(state.has(PLUGIN_INSTALLED_KEY)).toBe(false);
  });

  it('only updates on later starts, also when the plugin was uninstalled', async () => {
    state.set(PLUGIN_INSTALLED_KEY, true);
    installExtension('other', { source: 'x', autoUpdate: true });
    installExtension('manual', { source: 'y' });
    await run();
    expect(cliCalls()).toEqual([
      ['extensions', 'update', 'other', '--consent'],
    ]);
  });

  it('keeps going when an update fails', async () => {
    state.set(PLUGIN_INSTALLED_KEY, true);
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
    installExtension('dev', { source: SOURCE, autoUpdate: true });
    await run();
    expect(execFileMock).not.toHaveBeenCalled();
    expect(state.has(PLUGIN_INSTALLED_KEY)).toBe(false);
  });
});
