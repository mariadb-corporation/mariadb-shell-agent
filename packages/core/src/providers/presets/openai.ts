/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '../../core/contentGenerator.js';
import type { ProviderConfig } from '../types.js';

export const OPENAI_PROVIDER_ENV_KEY = 'OPENAI_API_KEY';
// The Responses wire appends `/v1/responses` itself (see the protocol's
// default in provider-config.ts), so the base URL carries no `/v1`.
export const OPENAI_PROVIDER_BASE_URL = 'https://api.openai.com';

export const openaiProvider: ProviderConfig = {
  id: 'openai',
  label: 'OpenAI API Key',
  description: 'Quick setup for OpenAI models with an OpenAI API key',
  // Current OpenAI models are served on the Responses API; the install
  // stores the models as OpenAI models with `wireApi: 'responses'`.
  protocol: AuthType.USE_OPENAI_RESPONSES,
  baseUrl: OPENAI_PROVIDER_BASE_URL,
  envKey: OPENAI_PROVIDER_ENV_KEY,
  models: [{ id: 'gpt-6.1-sol' }],
  modelsEditable: true,
  // Owned models need this name prefix as well as the env key, so models a
  // user configured by hand with OPENAI_API_KEY are left alone on install.
  modelNamePrefix: 'OpenAI',
  documentationUrl: 'https://platform.openai.com/docs/models',
  uiGroup: 'third-party',
};
