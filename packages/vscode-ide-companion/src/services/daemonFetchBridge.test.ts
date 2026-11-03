/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  env: { uiKind: 2 },
  UIKind: { Desktop: 1, Web: 2 },
}));

import { DaemonFetchBridge, shouldBridgeDaemon } from './daemonFetchBridge.js';

type Posted = { type: string; data: Record<string, unknown> };

function fakeWebview() {
  const posted: Posted[] = [];
  return {
    posted,
    webview: {
      postMessage: vi.fn(async (message: Posted) => {
        posted.push(message);
        return true;
      }),
    } as never,
  };
}

async function settled(posted: Posted[], id: string): Promise<Posted[]> {
  for (let i = 0; i < 200; i++) {
    const mine = posted.filter((m) => m.data['id'] === id);
    if (
      mine.some(
        (m) => m.type === 'daemonFetchEnd' || m.type === 'daemonFetchError',
      )
    ) {
      return mine;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`no end for ${id}`);
}

describe('DaemonFetchBridge', () => {
  let server: http.Server;
  let baseUrl: string;
  let lastRequest:
    | { method?: string; url?: string; auth?: string; body: string }
    | undefined;

  beforeEach(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        lastRequest = {
          method: req.method,
          url: req.url,
          auth: req.headers.authorization,
          body,
        };
        if (req.url === '/stream') {
          res.writeHead(200, { 'content-type': 'text/event-stream' });
          res.write('data: one\n\n');
          setTimeout(() => res.end('data: two\n\n'), 20);
          return;
        }
        res.writeHead(201, {
          'content-type': 'application/json',
          'x-daemon': 'yes',
        });
        res.end(JSON.stringify({ ok: true }));
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    lastRequest = undefined;
  });

  afterEach(async () => {
    await new Promise((r) => server.close(r));
  });

  it('is used in browser-based hosts', () => {
    expect(shouldBridgeDaemon()).toBe(true);
  });

  it('forwards a daemon request and returns status, headers and body', async () => {
    const bridge = new DaemonFetchBridge(() => baseUrl);
    const { posted, webview } = fakeWebview();
    const handled = bridge.handle(
      {
        type: 'daemonFetch',
        data: {
          id: 'r1',
          url: `${baseUrl}/workspace?x=1`,
          method: 'POST',
          headers: [
            ['authorization', 'Bearer t'],
            ['content-type', 'application/json'],
          ],
          body: Buffer.from('{"a":1}').toString('base64'),
        },
      },
      webview,
    );
    expect(handled).toBe(true);
    const messages = await settled(posted, 'r1');
    expect(lastRequest).toEqual({
      method: 'POST',
      url: '/workspace?x=1',
      auth: 'Bearer t',
      body: '{"a":1}',
    });
    const head = messages.find((m) => m.type === 'daemonFetchHead')!;
    expect(head.data['status']).toBe(201);
    expect(head.data['headers']).toContainEqual(['x-daemon', 'yes']);
    const body = messages
      .filter((m) => m.type === 'daemonFetchChunk')
      .map((m) => Buffer.from(m.data['data'] as string, 'base64').toString())
      .join('');
    expect(JSON.parse(body)).toEqual({ ok: true });
    expect(messages.at(-1)!.type).toBe('daemonFetchEnd');
  });

  it('streams a response in chunks as it arrives', async () => {
    const bridge = new DaemonFetchBridge(() => baseUrl);
    const { posted, webview } = fakeWebview();
    bridge.handle(
      {
        type: 'daemonFetch',
        data: {
          id: 's1',
          url: `${baseUrl}/stream`,
          method: 'GET',
          headers: [],
        },
      },
      webview,
    );
    const messages = await settled(posted, 's1');
    const chunks = messages.filter((m) => m.type === 'daemonFetchChunk');
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(
      chunks
        .map((m) => Buffer.from(m.data['data'] as string, 'base64').toString())
        .join(''),
    ).toBe('data: one\n\ndata: two\n\n');
  });

  it('refuses anything but the daemon origin', async () => {
    const bridge = new DaemonFetchBridge(() => baseUrl);
    const { posted, webview } = fakeWebview();
    bridge.handle(
      {
        type: 'daemonFetch',
        data: {
          id: 'x1',
          url: 'http://127.0.0.1:1/other',
          method: 'GET',
          headers: [],
        },
      },
      webview,
    );
    const messages = await settled(posted, 'x1');
    expect(messages).toEqual([
      {
        type: 'daemonFetchError',
        data: { id: 'x1', message: 'not a daemon URL' },
      },
    ]);
    expect(lastRequest).toBeUndefined();
  });

  it('refuses everything while no daemon is bridged', async () => {
    const bridge = new DaemonFetchBridge(() => undefined);
    const { posted, webview } = fakeWebview();
    bridge.handle(
      {
        type: 'daemonFetch',
        data: {
          id: 'n1',
          url: `${baseUrl}/workspace`,
          method: 'GET',
          headers: [],
        },
      },
      webview,
    );
    expect((await settled(posted, 'n1'))[0]!.type).toBe('daemonFetchError');
    expect(lastRequest).toBeUndefined();
  });

  it('ignores unrelated messages', () => {
    const bridge = new DaemonFetchBridge(() => baseUrl);
    expect(
      bridge.handle({ type: 'webShellPermissionState' }, fakeWebview().webview),
    ).toBe(false);
  });
});
