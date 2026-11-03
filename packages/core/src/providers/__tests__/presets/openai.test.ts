/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { AuthType } from '../../../core/contentGenerator.js';
import { openaiProvider } from '../../presets/openai.js';
import {
  ALL_PROVIDERS,
  THIRD_PARTY_PROVIDERS,
  findProviderByCredentials,
  findProviderById,
  getAllProviderBaseUrls,
} from '../../all-providers.js';
import { buildInstallPlan } from '../../provider-config.js';

describe('openaiProvider', () => {
  it('has correct provider config', () => {
    expect(openaiProvider).toMatchObject({
      id: 'openai',
      label: 'OpenAI API Key',
      protocol: AuthType.USE_OPENAI_RESPONSES,
      baseUrl: 'https://api.openai.com',
      envKey: 'OPENAI_API_KEY',
      models: [{ id: 'gpt-6.1-sol' }],
      modelsEditable: true,
      uiGroup: 'third-party',
    });
  });

  it('is registered right after Requesty', () => {
    expect(findProviderById('openai')).toBe(openaiProvider);
    expect(THIRD_PARTY_PROVIDERS).toContain(openaiProvider);
    const ids = ALL_PROVIDERS.map((p) => p.id);
    expect(ids.indexOf('openai')).toBe(ids.indexOf('requesty') + 1);
    expect(getAllProviderBaseUrls()).toContain('https://api.openai.com');
  });

  it('is found by its env key + base URL credentials', () => {
    expect(
      findProviderByCredentials('https://api.openai.com', 'OPENAI_API_KEY')?.id,
    ).toBe('openai');
    // The Chat Completions endpoint of a hand-made OpenAI setup is not it.
    expect(
      findProviderByCredentials('https://api.openai.com/v1', 'OPENAI_API_KEY'),
    ).toBeUndefined();
  });

  it('leaves models configured by hand with the same key alone', () => {
    const plan = buildInstallPlan(openaiProvider, {
      baseUrl: 'https://api.openai.com',
      apiKey: 'sk',
      modelIds: ['gpt-6.1-sol'],
    });
    const owns = plan.modelProviders?.[0]?.ownsModel;
    expect(
      owns?.({ id: 'gpt-5.5', name: 'gpt-5.5', envKey: 'OPENAI_API_KEY' }),
    ).toBe(false);
    expect(
      owns?.({
        id: 'gpt-5.2-codex',
        name: '[OpenAI] gpt-5.2-codex',
        envKey: 'OPENAI_API_KEY',
      }),
    ).toBe(true);
  });

  it('installs OpenAI models on the Responses wire', () => {
    const plan = buildInstallPlan(openaiProvider, {
      baseUrl: 'https://api.openai.com',
      apiKey: 'sk-openai',
      modelIds: ['gpt-6.1-sol', 'gpt-5.2-codex'],
    });

    expect(plan.authType).toBe(AuthType.USE_OPENAI_RESPONSES);
    expect(plan.modelProviders?.[0]?.authType).toBe(AuthType.USE_OPENAI);
    expect(plan.env).toEqual({ OPENAI_API_KEY: 'sk-openai' });
    expect(plan.modelSelection).toMatchObject({ modelId: 'gpt-6.1-sol' });
    const models = plan.modelProviders?.[0]?.models;
    expect(models).toHaveLength(2);
    expect(models?.[0]).toMatchObject({
      id: 'gpt-6.1-sol',
      name: '[OpenAI] gpt-6.1-sol',
      baseUrl: 'https://api.openai.com',
      envKey: 'OPENAI_API_KEY',
      wireApi: 'responses',
    });
  });
});
