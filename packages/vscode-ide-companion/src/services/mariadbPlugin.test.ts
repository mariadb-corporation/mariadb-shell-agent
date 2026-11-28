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
  let bundledDir: string;
  let copyDir: string;
  let state: Map<string, unknown>;
  let context: vscode.ExtensionContext;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'mariadb-plugin-'));
    vi.stubEnv('MARIADB_SHELL_AGENT_HOME', home);
    const extensionPath = path.join(home, 'vsix');
    bundledDir = path.join(extensionPath, 'dist', 'mariadb-dev-plugin');
    copyDir = path.join(home, 'storage', 'mariadb-dev-plugin');
    bundle('26.11.1');
    state = new Map();
    context = {
      extensionPath,
      globalStorageUri: { fsPath: path.join(home, 'storage') },
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
    execFileMock.mockImplementation(fakeCli());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(home, { recursive: true, force: true });
  });

  function bundle(version: string) {
    fs.mkdirSync(path.join(bundledDir, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(
      path.join(bundledDir, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ name: 'dev', version }),
    );
  }

  function readJsonFile(file: string) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  function installExtension(name: string, metadata: object, version = '1') {
    const dir = path.join(home, 'extensions', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.qwen-extension-install.json'),
      JSON.stringify(metadata),
    );
    fs.writeFileSync(
      path.join(dir, 'qwen-extension.json'),
      JSON.stringify({ name, version }),
    );
  }

  /** The CLI's install, update and uninstall of `dev`; `fail` makes one fail. */
  function fakeCli(fail?: string) {
    const dir = path.join(home, 'extensions', 'dev');
    const versionOf = (source: string) =>
      readJsonFile(path.join(source, '.claude-plugin', 'plugin.json')).version;
    return (
      _file: string,
      args: string[],
      _options: unknown,
      callback: (error: Error | null, result?: object) => void,
    ) => {
      const [, , command, target] = args;
      if (command === fail) return callback(new Error('failed'));
      if (command === 'uninstall') fs.rmSync(dir, { recursive: true });
      if (command === 'install') {
        installExtension(
          'dev',
          { type: 'local', source: target },
          versionOf(target),
        );
      }
      if (command === 'update' && target === 'dev') {
        const { source } = readJsonFile(
          path.join(dir, '.qwen-extension-install.json'),
        );
        installExtension('dev', { type: 'local', source }, versionOf(source));
      }
      callback(null, { stdout: '', stderr: '' });
    };
  }

  function cliCalls() {
    return execFileMock.mock.calls.map(([, args]) => args.slice(1));
  }

  async function run() {
    installAndUpdateMariaDbPlugin(context, 'cli.js');
    await mariaDbPluginSettled();
  }

  it('installs a copy of the bundled plugin through the bundled CLI and records its version', async () => {
    await run();
    expect(execFileMock).toHaveBeenCalledWith(
      process.execPath,
      ['cli.js', 'extensions', 'install', copyDir, '--consent'],
      expect.anything(),
      expect.any(Function),
    );
    expect(
      readJsonFile(path.join(copyDir, '.claude-plugin', 'plugin.json')).version,
    ).toBe('26.11.1');
    expect(state.get(PLUGIN_VERSION_KEY)).toBe('26.11.1');
  });

  it('updates its copy in place when the bundled version is new', async () => {
    bundle('26.11.0');
    await run();
    bundle('26.11.1');
    execFileMock.mockClear();
    await run();
    expect(cliCalls()).toEqual([['extensions', 'update', 'dev', '--consent']]);
    expect(state.get(PLUGIN_VERSION_KEY)).toBe('26.11.1');
  });

  it('replaces the copy 26.11.2 installed from GitHub', async () => {
    state.set('mariadbDevPluginInstalled', true);
    installExtension('dev', {
      type: 'git',
      source: 'https://github.com/mariadb/ai-plugins',
      autoUpdate: true,
    });
    await run();
    expect(cliCalls()).toEqual([
      ['extensions', 'uninstall', 'dev'],
      ['extensions', 'install', copyDir, '--consent'],
    ]);
    expect(state.get(PLUGIN_VERSION_KEY)).toBe('26.11.1');
  });

  it('installs afresh on the next start when replacing the GitHub copy failed', async () => {
    state.set('mariadbDevPluginInstalled', true);
    installExtension('dev', {
      type: 'git',
      source: 'https://github.com/mariadb/ai-plugins',
    });
    execFileMock.mockImplementation(fakeCli('install'));
    await run();
    execFileMock.mockImplementation(fakeCli());
    execFileMock.mockClear();
    await run();
    expect(cliCalls()).toEqual([
      ['extensions', 'install', copyDir, '--consent'],
    ]);
  });

  it.each([
    ['a link', { type: 'link', source: '/src/ai-plugins/claude/dev-plugin' }],
    ['another source', { type: 'git', source: 'https://example.com/dev' }],
  ])('leaves a dev extension from %s alone', async (_name, metadata) => {
    installExtension('dev', metadata);
    await run();
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it.each([
    [PLUGIN_VERSION_KEY, '26.11.0'],
    ['mariadbDevPluginInstalled', true],
  ])(
    'does not reinstall a plugin the user uninstalled (%s)',
    async (key, value) => {
      state.set(key, value);
      await run();
      expect(execFileMock).not.toHaveBeenCalled();
    },
  );

  it('does not reinstall the version it recorded last', async () => {
    state.set(PLUGIN_VERSION_KEY, '26.11.1');
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
    execFileMock.mockImplementation(fakeCli('install'));
    await run();
    expect(state.get(PLUGIN_VERSION_KEY)).toBeUndefined();
  });

  it('does not record an update that left the old version in place', async () => {
    bundle('26.11.0');
    await run();
    bundle('26.11.1');
    execFileMock.mockImplementation((_file, _args, _options, callback) =>
      callback(null, { stdout: 'already up to date', stderr: '' }),
    );
    await run();
    expect(state.get(PLUGIN_VERSION_KEY)).toBe('26.11.0');
  });

  it('updates the extensions with auto-update', async () => {
    state.set(PLUGIN_VERSION_KEY, '26.11.1');
    installExtension('other', { source: 'x', autoUpdate: true });
    installExtension('manual', { source: 'y' });
    await run();
    expect(cliCalls()).toEqual([
      ['extensions', 'update', 'other', '--consent'],
    ]);
  });

  it('keeps going when an update fails', async () => {
    state.set(PLUGIN_VERSION_KEY, '26.11.1');
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
