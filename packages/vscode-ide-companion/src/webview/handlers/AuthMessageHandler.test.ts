/**
 * @license
 * Copyright 2025 Qwen Team
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({ window: {} }));

import { AuthType, type ProviderConfig } from '@qwen-code/qwen-code-core';
import {
  AUTH_WIZARD_PROVIDER_IDS,
  AuthMessageHandler,
  describeWizardProvider,
} from './AuthMessageHandler.js';
import type {
  AuthWizardProvider,
  AuthWizardSubmission,
} from '../authWizardTypes.js';

function createHandler() {
  const sendToWebView = vi.fn();
  const handler = new AuthMessageHandler(
    {} as never,
    {} as never,
    null,
    sendToWebView,
  );
  const submit = vi.fn().mockResolvedValue(undefined);
  handler.setAuthInteractiveHandler(submit);
  return { handler, sendToWebView, submit };
}

async function openWizard(): Promise<AuthWizardProvider[]> {
  const { handler, sendToWebView } = createHandler();
  await handler.handle({ type: 'auth' });
  const message = sendToWebView.mock.calls[0]?.[0] as {
    type: string;
    data: { providers: AuthWizardProvider[] };
  };
  expect(message.type).toBe('authWizard');
  return message.data.providers;
}

async function submitAnswers(answers: Partial<AuthWizardSubmission>) {
  const created = createHandler();
  await created.handler.handle({ type: 'authWizardSubmit', data: answers });
  const types = created.sendToWebView.mock.calls.map(
    (call) => (call[0] as { type: string }).type,
  );
  return { ...created, types };
}

describe('AuthMessageHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('opening the wizard', () => {
    it('sends the wizard instead of starting a flow of its own', async () => {
      const { handler, sendToWebView, submit } = createHandler();

      await handler.handle({ type: 'auth' });

      expect(sendToWebView).toHaveBeenCalledTimes(1);
      expect(sendToWebView.mock.calls[0]?.[0]).toMatchObject({
        type: 'authWizard',
      });
      expect(submit).not.toHaveBeenCalled();
    });

    it('offers OpenRouter, Requesty, OpenAI, Grok and Custom, in that order', async () => {
      const providers = await openWizard();

      expect(providers.map((p) => p.id)).toEqual([...AUTH_WIZARD_PROVIDER_IDS]);
      expect(providers.map((p) => p.label)).toEqual([
        'OpenRouter',
        'Requesty',
        'OpenAI API Key',
        'Grok (xAI) API Key',
        'Custom Provider',
      ]);
    });

    it('describes a fixed-endpoint preset as API key + editable models', async () => {
      const providers = await openWizard();
      const openai = providers.find((p) => p.id === 'openai');

      expect(openai).toMatchObject({
        baseUrl: { kind: 'fixed' },
        wireApiProtocols: [],
        models: ['gpt-6.1-sol'],
        advancedConfig: false,
      });
      expect(openai?.protocols).toBeUndefined();
    });

    it('describes the custom provider with every step', async () => {
      const providers = await openWizard();
      const custom = providers.find((p) => p.id === 'custom-openai-compatible');

      // Raw AuthType strings must never reach the UI as labels.
      expect(custom?.protocols).toEqual([
        { value: 'openai', label: 'OpenAI Compatible' },
        { value: 'anthropic', label: 'Anthropic' },
        { value: 'gemini', label: 'Gemini' },
      ]);
      expect(custom?.wireApiProtocols).toEqual(['openai']);
      expect(custom?.advancedConfig).toBe(true);
      expect(custom?.models).toEqual([]);
      // The blank-input default follows the route, including the API pick:
      // Responses dials the /v1-less endpoint.
      expect(custom?.baseUrl).toEqual({
        kind: 'input',
        placeholders: {
          'openai|chat-completions': 'https://api.openai.com/v1',
          'openai|responses': 'https://api.openai.com',
          'anthropic|': 'https://api.anthropic.com/v1',
          'gemini|': 'https://generativelanguage.googleapis.com',
        },
      });
    });

    it('describes a BaseUrlOption array as an endpoint choice', () => {
      const provider: ProviderConfig = {
        id: 'regional',
        label: 'Regional',
        description: 'Two regions',
        protocol: AuthType.USE_OPENAI,
        baseUrl: [
          { id: 'a', label: 'Region A', url: 'https://a.example.com/v1' },
          { id: 'b', label: 'Region B', url: 'https://b.example.com/v1' },
        ],
        envKey: 'REGIONAL_API_KEY',
        models: [{ id: 'm' }],
        modelNamePrefix: 'Regional',
        uiLabels: { baseUrlStepTitle: 'Region' },
      };

      expect(describeWizardProvider(provider).baseUrl).toEqual({
        kind: 'choice',
        stepTitle: 'Region',
        options: [
          {
            value: 'https://a.example.com/v1',
            label: 'Region A',
            description: 'https://a.example.com/v1',
          },
          {
            value: 'https://b.example.com/v1',
            label: 'Region B',
            description: 'https://b.example.com/v1',
          },
        ],
      });
    });
  });

  it('answers a cancelled wizard with authCancelled', async () => {
    const { handler, sendToWebView } = createHandler();

    await handler.handle({ type: 'authWizardCancel' });

    expect(sendToWebView).toHaveBeenCalledWith({ type: 'authCancelled' });
  });

  describe('submitting answers', () => {
    it('drives a fixed-baseUrl preset through to authInteractiveHandler', async () => {
      const { submit, types } = await submitAnswers({
        providerId: 'openai',
        apiKey: '  sk-openai  ',
        models: 'gpt-6.1-sol, gpt-5.5',
      });

      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'openai' }),
        expect.objectContaining({
          protocol: undefined,
          baseUrl: 'https://api.openai.com',
          // Trimmed, as the CLI does.
          apiKey: 'sk-openai',
          modelIds: ['gpt-6.1-sol', 'gpt-5.5'],
        }),
      );
      expect(types).toEqual(['authWizardDone']);
    });

    it('drives the custom provider through protocol + url + key + models + advanced', async () => {
      const { submit } = await submitAnswers({
        providerId: 'custom-openai-compatible',
        protocol: 'anthropic',
        baseUrl: 'https://my-proxy.example.com/v1',
        apiKey: 'sk-custom-anthropic',
        models: 'claude-3-opus, claude-3-sonnet',
        enableThinking: true,
      });

      const [providerConfig, inputs] = submit.mock.calls[0]!;
      expect(providerConfig.id).toBe('custom-openai-compatible');
      expect(inputs).toEqual({
        protocol: 'anthropic',
        baseUrl: 'https://my-proxy.example.com/v1',
        apiKey: 'sk-custom-anthropic',
        modelIds: ['claude-3-opus', 'claude-3-sonnet'],
        advancedConfig: { enableThinking: true },
      });
    });

    it('collects Responses as an API choice within OpenAI setup', async () => {
      const { submit } = await submitAnswers({
        providerId: 'custom-openai-compatible',
        protocol: 'openai',
        wireApi: 'responses',
        baseUrl: 'https://gateway.example/v1',
        apiKey: 'key',
        models: 'model',
        enableThinking: false,
      });

      expect(submit).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          protocol: 'openai',
          wireApi: 'responses',
          modelIds: ['model'],
          advancedConfig: { enableThinking: false },
        }),
      );
    });

    it.each([
      ['openai', 'chat-completions', 'https://api.openai.com/v1'],
      ['openai', 'responses', 'https://api.openai.com'],
      ['anthropic', undefined, 'https://api.anthropic.com/v1'],
    ] as const)(
      'falls back to the %s/%s default when the URL is blank',
      async (protocol, wireApi, expected) => {
        const { submit } = await submitAnswers({
          providerId: 'custom-openai-compatible',
          protocol,
          ...(wireApi ? { wireApi } : {}),
          baseUrl: '  ',
          apiKey: 'sk',
          models: 'model',
          enableThinking: false,
        });

        expect(submit).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ protocol, baseUrl: expected }),
        );
      },
    );

    it.each<[string, Partial<AuthWizardSubmission>, string]>([
      ['an unknown provider', { providerId: 'deepseek' }, 'provider'],
      [
        'a missing protocol',
        { providerId: 'custom-openai-compatible' },
        'protocol',
      ],
      [
        'a missing OpenAI API',
        { providerId: 'custom-openai-compatible', protocol: 'openai' },
        'OpenAI API',
      ],
      [
        'a non-http(s) base URL',
        {
          providerId: 'custom-openai-compatible',
          protocol: 'openai',
          wireApi: 'chat-completions',
          baseUrl: 'file:///etc/passwd',
        },
        'http',
      ],
      ['a blank API key', { providerId: 'grok', apiKey: '   ' }, 'API key'],
      [
        'whitespace-only model IDs',
        { providerId: 'grok', apiKey: 'xai', models: ' , , ,' },
        'Model IDs',
      ],
      [
        'a missing thinking choice',
        {
          providerId: 'custom-openai-compatible',
          protocol: 'gemini',
          apiKey: 'k',
          models: 'm',
        },
        'thinking',
      ],
    ])(
      'rejects %s in the wizard without connecting',
      async (_name, answers, text) => {
        const { submit, sendToWebView, types } = await submitAnswers(answers);

        expect(sendToWebView).toHaveBeenCalledWith({
          type: 'authWizardError',
          data: { message: expect.stringContaining(text) },
        });
        expect(submit).not.toHaveBeenCalled();
        // Not authError (that reports a failed connection and drops the
        // auth state) and not authCancelled (that closes the wizard).
        expect(types).toEqual(['authWizardError', 'authWizardDone']);
      },
    );

    it('reports a failing install as authError and still finishes', async () => {
      const created = createHandler();
      created.submit.mockRejectedValueOnce(new Error('disk full'));

      await created.handler.handle({
        type: 'authWizardSubmit',
        data: { providerId: 'openrouter', apiKey: 'sk-or', models: 'a/b' },
      });

      const messages = created.sendToWebView.mock.calls.map((c) => c[0]);
      expect(messages).toEqual([
        { type: 'authError', data: { message: 'Auth failed: disk full' } },
        { type: 'authWizardDone' },
      ]);
    });
  });
});
