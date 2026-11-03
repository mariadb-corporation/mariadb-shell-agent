/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthWizard, getWizardSteps } from './AuthWizard.js';
import type { AuthWizardProvider } from '../authWizardTypes.js';
import { createChromeStrings } from '../strings.js';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const t = createChromeStrings('en');

const OPENAI: AuthWizardProvider = {
  id: 'openai',
  label: 'OpenAI API Key',
  description: 'OpenAI models',
  wireApiProtocols: [],
  baseUrl: { kind: 'fixed' },
  apiKeyPlaceholder: 'sk-...',
  models: ['gpt-6.1-sol'],
  advancedConfig: false,
};

const CUSTOM: AuthWizardProvider = {
  id: 'custom-openai-compatible',
  label: 'Custom Provider',
  description: 'Anything else',
  protocols: [
    { value: 'openai', label: 'OpenAI Compatible' },
    { value: 'anthropic', label: 'Anthropic' },
  ],
  wireApiProtocols: ['openai'],
  baseUrl: {
    kind: 'input',
    placeholders: {
      'openai|chat-completions': 'https://api.openai.com/v1',
      'openai|responses': 'https://api.openai.com',
      'anthropic|': 'https://api.anthropic.com/v1',
    },
  },
  apiKeyPlaceholder: 'sk-...',
  models: [],
  advancedConfig: true,
};

const REGIONAL: AuthWizardProvider = {
  id: 'regional',
  label: 'Regional',
  description: 'Two regions',
  wireApiProtocols: [],
  baseUrl: {
    kind: 'choice',
    stepTitle: 'Region',
    options: [
      { value: 'https://a.example.com/v1', label: 'Region A' },
      { value: 'https://b.example.com/v1', label: 'Region B' },
    ],
  },
  apiKeyPlaceholder: 'key',
  advancedConfig: false,
};

const mounted: Array<{ container: HTMLElement; root: Root }> = [];

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
});

async function renderWizard(
  props: { submitting?: boolean; error?: string } = {},
) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted.push({ container, root });
  const render = async (next: { submitting?: boolean; error?: string }) =>
    act(async () => {
      root.render(
        <AuthWizard
          providers={[OPENAI, CUSTOM, REGIONAL]}
          t={t}
          theme="dark"
          submitting={next.submitting ?? false}
          error={next.error}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
      );
    });
  await render(props);
  return { container, onSubmit, onCancel, rerender: render };
}

function heading(container: HTMLElement): string {
  return container.textContent ?? '';
}

async function clickOption(container: HTMLElement, label: string) {
  const option = [
    ...container.querySelectorAll<HTMLButtonElement>('[data-wizard-option]'),
  ].find((button) => button.textContent?.startsWith(label));
  if (!option) throw new Error(`No option ${label}`);
  await act(async () => option.click());
}

async function clickButton(container: HTMLElement, label: string) {
  const button = [...container.querySelectorAll('button')].find(
    (b) => b.textContent === label,
  );
  if (!button) throw new Error(`No button ${label}`);
  await act(async () => button.click());
}

async function type(container: HTMLElement, value: string) {
  const input = container.querySelector<HTMLInputElement>(
    '[data-wizard-input]',
  );
  if (!input) throw new Error('No input');
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function pressEnter(container: HTMLElement) {
  const input = container.querySelector('[data-wizard-input]')!;
  await act(async () => {
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
  });
}

describe('getWizardSteps', () => {
  it('lists the steps the provider and the answers so far call for', () => {
    expect(getWizardSteps(undefined, {})).toEqual(['provider']);
    expect(getWizardSteps(OPENAI, {})).toEqual([
      'provider',
      'apiKey',
      'models',
    ]);
    expect(getWizardSteps(CUSTOM, { protocol: 'openai' })).toEqual([
      'provider',
      'protocol',
      'wireApi',
      'baseUrl',
      'apiKey',
      'models',
      'advanced',
    ]);
    expect(getWizardSteps(CUSTOM, { protocol: 'anthropic' })).toEqual([
      'provider',
      'protocol',
      'baseUrl',
      'apiKey',
      'models',
      'advanced',
    ]);
    expect(getWizardSteps(REGIONAL, {})).toEqual([
      'provider',
      'baseUrl',
      'apiKey',
    ]);
  });
});

describe('AuthWizard', () => {
  it('starts with the providers and their descriptions', async () => {
    const { container } = await renderWizard();

    expect(heading(container)).toContain(
      'MariaDB Shell AgentProvider Setup Wizard',
    );
    expect(heading(container)).not.toContain('Step');
    const options = [...container.querySelectorAll('[data-wizard-option]')];
    expect(options.map((o) => o.textContent)).toEqual([
      'OpenAI API KeyOpenAI models',
      'Custom ProviderAnything else',
      'RegionalTwo regions',
    ]);
  });

  it('walks a fixed-endpoint preset through API key and models', async () => {
    const { container, onSubmit } = await renderWizard();

    await clickOption(container, 'OpenAI API Key');
    expect(heading(container)).toContain('OpenAI API Key · Step 2 of 3');
    // The product header stays on top of every step.
    expect(heading(container)).toContain(
      'MariaDB Shell AgentProvider Setup Wizard',
    );
    expect(container.querySelector('input')?.type).toBe('password');

    await type(container, 'sk-openai');
    await pressEnter(container);
    // The models step starts from the preset's defaults.
    expect(container.querySelector('input')?.value).toBe('gpt-6.1-sol');
    await clickButton(container, 'Connect');

    expect(onSubmit).toHaveBeenCalledWith({
      providerId: 'openai',
      apiKey: 'sk-openai',
      models: 'gpt-6.1-sol',
    });
  });

  it('walks the custom provider through every step', async () => {
    const { container, onSubmit } = await renderWizard();

    await clickOption(container, 'Custom Provider');
    await clickOption(container, 'OpenAI Compatible');
    await clickOption(container, 'Responses');
    // The base URL placeholder follows the API choice.
    expect(container.querySelector('input')?.placeholder).toBe(
      'https://api.openai.com',
    );
    await clickButton(container, 'Next');
    await type(container, 'key');
    await clickButton(container, 'Next');
    await type(container, 'model-a, model-b');
    await clickButton(container, 'Next');
    expect(heading(container)).toContain('Enable thinking mode?');
    await clickOption(container, 'Yes');

    expect(onSubmit).toHaveBeenCalledWith({
      providerId: 'custom-openai-compatible',
      protocol: 'openai',
      wireApi: 'responses',
      baseUrl: '',
      apiKey: 'key',
      models: 'model-a, model-b',
      enableThinking: true,
    });
  });

  it('offers an endpoint choice for providers with several base URLs', async () => {
    const { container, onSubmit } = await renderWizard();

    await clickOption(container, 'Regional');
    expect(heading(container)).toContain('Region');
    await clickOption(container, 'Region B');
    await type(container, 'k');
    await clickButton(container, 'Connect');

    expect(onSubmit).toHaveBeenCalledWith({
      providerId: 'regional',
      baseUrl: 'https://b.example.com/v1',
      apiKey: 'k',
    });
  });

  it('validates input steps before moving on', async () => {
    const { container, onSubmit } = await renderWizard();

    await clickOption(container, 'Custom Provider');
    await clickOption(container, 'Anthropic');
    await type(container, 'ftp://proxy');
    await clickButton(container, 'Next');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Base URL must start with http:// or https://.',
    );

    await type(container, '');
    await clickButton(container, 'Next');
    await clickButton(container, 'Next');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'This field is required',
    );

    await type(container, 'key');
    await clickButton(container, 'Next');
    await type(container, ' , ,');
    await clickButton(container, 'Next');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Model IDs cannot be empty.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('goes back keeping the answers, and resets them for another provider', async () => {
    const { container } = await renderWizard();

    await clickOption(container, 'OpenAI API Key');
    await type(container, 'sk-openai');
    await clickButton(container, 'Next');
    await clickButton(container, 'Back');
    expect(container.querySelector('input')?.value).toBe('sk-openai');

    await clickButton(container, 'Back');
    expect(
      container.querySelector('[aria-pressed="true"]')?.textContent,
    ).toContain('OpenAI API Key');
    await clickOption(container, 'Regional');
    await clickOption(container, 'Region A');
    expect(container.querySelector('input')?.value).toBe('');
  });

  it('cancels with the button and with Escape', async () => {
    const { container, onCancel } = await renderWizard();

    await clickButton(container, 'Cancel');
    const panel = container.querySelector('[data-auth-wizard]')!;
    await act(async () => {
      panel.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('shows the host error and locks the controls while connecting', async () => {
    const { container, rerender } = await renderWizard();
    await clickOption(container, 'OpenAI API Key');

    await rerender({ submitting: true });
    expect(container.querySelector('input')?.disabled).toBe(true);
    expect(heading(container)).toContain('Connecting…');

    await rerender({ error: 'Connection established but auth failed.' });
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Connection established but auth failed.',
    );
    expect(container.querySelector('input')?.disabled).toBe(false);
  });
});
