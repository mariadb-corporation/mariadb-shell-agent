/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Extension-host end of the webview's daemon bridge (see webview/daemonFetchBridge.ts).
 *
 * In a browser-based IDE the webview cannot reach the daemon on this machine's loopback, so it
 * sends its daemon requests here as messages. They are performed next to the daemon and the
 * response is streamed back in chunks. Only requests to the daemon's own origin are forwarded.
 */

import * as vscode from 'vscode';

interface DaemonFetchRequest {
  id: string;
  url: string;
  method: string;
  headers: Array<[string, string]>;
  body?: string;
}

/**
 * Whether the webview should reach the daemon through the extension host: in a browser-based
 * host (no port forwarding to the user's machine).
 */
export function shouldBridgeDaemon(): boolean {
  return vscode.env.uiKind === vscode.UIKind.Web;
}

export class DaemonFetchBridge {
  private readonly inFlight = new Map<string, AbortController>();

  /** @param daemonBaseUrl the daemon address this bridge may forward to, or undefined. */
  constructor(private readonly daemonBaseUrl: () => string | undefined) {}

  /** Handles a bridge message from `webview`; returns false for any other message. */
  handle(
    message: { type: string; data?: unknown },
    webview: vscode.Webview,
  ): boolean {
    if (message.type === 'daemonFetchAbort') {
      const id = (message.data as { id?: unknown } | undefined)?.id;
      if (typeof id === 'string') this.inFlight.get(id)?.abort();
      return true;
    }
    if (message.type !== 'daemonFetch') return false;
    void this.forward(message.data as DaemonFetchRequest, webview);
    return true;
  }

  dispose(): void {
    for (const controller of this.inFlight.values()) controller.abort();
    this.inFlight.clear();
  }

  private async forward(
    request: DaemonFetchRequest,
    webview: vscode.Webview,
  ): Promise<void> {
    const { id } = request;
    const post = (type: string, data: Record<string, unknown>) =>
      webview.postMessage({ type, data: { id, ...data } }).then(
        (delivered) => delivered,
        () => false,
      );
    const baseUrl = this.daemonBaseUrl();
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      await post('daemonFetchError', { message: 'invalid URL' });
      return;
    }
    if (!baseUrl || url.origin !== new URL(baseUrl).origin) {
      await post('daemonFetchError', { message: 'not a daemon URL' });
      return;
    }
    const controller = new AbortController();
    this.inFlight.set(id, controller);
    try {
      const response = await fetch(url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? Buffer.from(request.body, 'base64') : undefined,
        signal: controller.signal,
      });
      const headers: Array<[string, string]> = [];
      response.headers.forEach((value, name) => headers.push([name, value]));
      await post('daemonFetchHead', {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      if (response.body) {
        const reader = response.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          // Stop reading when the webview is gone; aborting releases the daemon request.
          if (
            !(await post('daemonFetchChunk', {
              data: Buffer.from(value).toString('base64'),
            }))
          ) {
            controller.abort();
            return;
          }
        }
      }
      await post('daemonFetchEnd', {});
    } catch (error) {
      if (!controller.signal.aborted) {
        await post('daemonFetchError', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      this.inFlight.delete(id);
    }
  }
}
