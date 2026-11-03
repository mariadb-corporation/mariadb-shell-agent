/**
 * @license
 * Copyright 2025 Qwen Team
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

// First: routes daemon requests through the extension host where the webview cannot reach it.
import './daemonFetchBridge.js';
import ReactDOM from 'react-dom/client';
import { EmbeddedApp } from './EmbeddedApp.js';
import { initializeWebviewLogger } from './hooks/useVSCode.js';

initializeWebviewLogger();

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<EmbeddedApp />);
}
