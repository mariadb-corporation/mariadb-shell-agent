/**
 * @license
 * Copyright 2025 Qwen Team
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '../../core/contentGenerator.js';
import type { ProviderConfig } from '../types.js';

export const REQUESTY_ENV_KEY = 'REQUESTY_API_KEY';
export const REQUESTY_BASE_URL = 'https://router.requesty.ai/v1';

export const requestyProvider: ProviderConfig = {
  id: 'requesty',
  label: 'Requesty',
  description:
    'Connect with a Requesty API key (get one from app.requesty.ai/api-keys)',
  protocol: AuthType.USE_OPENAI,
  baseUrl: REQUESTY_BASE_URL,
  envKey: REQUESTY_ENV_KEY,
  models: [
    { id: 'openai/gpt-4o-mini', contextWindowSize: 128000 },
    { id: 'openai/gpt-4o', contextWindowSize: 128000 },
  ],
  modelsEditable: true,
  modelNamePrefix: 'Requesty',
  ownsModel: (model) => {
    if (model.envKey !== REQUESTY_ENV_KEY) return false;
    try {
      const host = new URL(model.baseUrl ?? '').hostname;
      return host === 'router.requesty.ai' || host.endsWith('.requesty.ai');
    } catch {
      return false;
    }
  },
  documentationUrl: 'https://docs.requesty.ai',
  uiGroup: 'third-party',
};
