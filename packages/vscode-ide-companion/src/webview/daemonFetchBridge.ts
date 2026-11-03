/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Daemon requests through the extension host, for hosts whose webview cannot reach the daemon.
 *
 * The daemon binds the loopback of the machine running the extension host. In a browser-based
 * IDE (Theia, code-server, VS Code for the Web) the webview runs in the user's browser, where
 * that loopback is the user's own machine, and there is no port forwarding. When the extension
 * host announces `daemonBridge` in `webShellBootstrap`, every `fetch` to the daemon's origin is
 * sent as messages to the extension host, which performs it next to the daemon and streams the
 * response back (see services/daemonFetchBridge.ts). Other requests use the browser's `fetch`.
 *
 * Imported first by index.tsx, so the wrapper is in place before any module keeps a reference
 * to `fetch`.
 */

import { getVSCodeAPI } from './hooks/useVSCode.js';

interface PendingResponse {
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
  controller?: ReadableStreamDefaultController<Uint8Array>;
}

const nativeFetch = globalThis.fetch.bind(globalThis);
const pending = new Map<string, PendingResponse>();
let bridgedOrigin: string | undefined;
let nextId = 0;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function abortError(): Error {
  return new DOMException('The operation was aborted.', 'AbortError');
}

async function bridgedFetch(request: Request): Promise<Response> {
  const id = `daemon-fetch-${++nextId}`;
  const vscode = getVSCodeAPI();
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : new Uint8Array(await request.arrayBuffer());
  const headers: Array<[string, string]> = [];
  request.headers.forEach((value, name) => headers.push([name, value]));

  return new Promise<Response>((resolve, reject) => {
    const entry: PendingResponse = { resolve, reject };
    pending.set(id, entry);
    const onAbort = () => {
      if (!pending.has(id)) return;
      vscode.postMessage({ type: 'daemonFetchAbort', data: { id } });
      entry.controller?.error(abortError());
      entry.reject(abortError());
      pending.delete(id);
    };
    if (request.signal.aborted) {
      onAbort();
      return;
    }
    request.signal.addEventListener('abort', onAbort, { once: true });
    vscode.postMessage({
      type: 'daemonFetch',
      data: {
        id,
        url: request.url,
        method: request.method,
        headers,
        body: body && body.length > 0 ? toBase64(body) : undefined,
      },
    });
  });
}

function onHostMessage(event: MessageEvent): void {
  const message = event.data as {
    type?: string;
    data?: Record<string, unknown>;
  };
  if (message?.type === 'webShellBootstrap') {
    const baseUrl = message.data?.['baseUrl'];
    bridgedOrigin =
      message.data?.['daemonBridge'] === true && typeof baseUrl === 'string'
        ? new URL(baseUrl).origin
        : undefined;
    return;
  }
  if (
    typeof message?.type !== 'string' ||
    !message.type.startsWith('daemonFetch')
  ) {
    return;
  }
  const id = message.data?.['id'];
  const entry = typeof id === 'string' ? pending.get(id) : undefined;
  if (!entry) return;
  switch (message.type) {
    case 'daemonFetchHead': {
      const data = message.data as {
        status: number;
        statusText: string;
        headers: Array<[string, string]>;
      };
      const nullBody = [101, 204, 205, 304].includes(data.status);
      const stream = nullBody
        ? null
        : new ReadableStream<Uint8Array>({
            start(controller) {
              entry.controller = controller;
            },
          });
      entry.resolve(
        new Response(stream, {
          status: data.status,
          statusText: data.statusText,
          headers: data.headers,
        }),
      );
      if (nullBody) pending.delete(id as string);
      break;
    }
    case 'daemonFetchChunk':
      entry.controller?.enqueue(fromBase64(message.data?.['data'] as string));
      break;
    case 'daemonFetchEnd':
      entry.controller?.close();
      pending.delete(id as string);
      break;
    case 'daemonFetchError': {
      const error = new TypeError(
        `Daemon request failed: ${String(message.data?.['message'])}`,
      );
      if (entry.controller) entry.controller.error(error);
      else entry.reject(error);
      pending.delete(id as string);
      break;
    }
    default:
      break;
  }
}

window.addEventListener('message', onHostMessage);

globalThis.fetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  if (bridgedOrigin) {
    const request = new Request(input, init);
    if (new URL(request.url).origin === bridgedOrigin) {
      return bridgedFetch(request);
    }
  }
  return nativeFetch(input, init);
};
