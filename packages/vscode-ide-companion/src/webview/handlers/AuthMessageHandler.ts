/**
 * @license
 * Copyright 2025 Qwen Team
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from '../../utils/logger.js';
import { BaseMessageHandler } from './BaseMessageHandler.js';
import { getErrorMessage } from '../../utils/errorMessage.js';
import {
  AuthType,
  findProviderById,
  shouldShowStep,
  resolveBaseUrl,
  resolveModelProtocol,
  getDefaultBaseUrlForProtocol,
  getDefaultModelIds,
  type ModelWireApi,
  type ProviderConfig,
  type ProviderSetupInputs,
  type BaseUrlOption,
} from '@qwen-code/qwen-code-core';
import {
  authWizardRouteKey,
  type AuthWizardBaseUrl,
  type AuthWizardProvider,
  type AuthWizardSubmission,
  type AuthWizardWireApi,
} from '../authWizardTypes.js';

/** The providers the setup wizard offers, in display order. */
export const AUTH_WIZARD_PROVIDER_IDS = [
  'openrouter',
  'requesty',
  'openai',
  'grok',
  'custom-openai-compatible',
] as const;

// AuthType's raw string values ('openai' / 'anthropic' / 'gemini') are an
// implementation detail; the wizard shows human-readable labels.
const PROTOCOL_LABELS: Record<string, string> = {
  [AuthType.USE_OPENAI]: 'OpenAI Compatible',
  [AuthType.USE_ANTHROPIC]: 'Anthropic',
  [AuthType.USE_GEMINI]: 'Gemini',
};

const WIRE_APIS: readonly AuthWizardWireApi[] = [
  'chat-completions',
  'responses',
];

function getWizardProviders(): ProviderConfig[] {
  return AUTH_WIZARD_PROVIDER_IDS.map((id) => findProviderById(id)).filter(
    (p): p is ProviderConfig => p !== undefined,
  );
}

function hasProtocolStep(provider: ProviderConfig): boolean {
  return (
    shouldShowStep(provider, 'protocol') &&
    !!provider.protocolOptions &&
    provider.protocolOptions.length > 1
  );
}

/**
 * Free-form URL default for a route. The effective route includes the API
 * step's pick: a Responses choice dials the /v1-less default endpoint, so
 * deriving the fallback from the raw bucket protocol would persist the Chat
 * Completions endpoint on the Responses wire. No local fallback:
 * getDefaultBaseUrlForProtocol owns the defaults, so CLI and VS Code stay in
 * sync.
 */
function getBaseUrlPlaceholder(
  provider: ProviderConfig,
  protocol: AuthType | undefined,
  wireApi: ModelWireApi | undefined,
): string {
  const effectiveProtocol =
    resolveModelProtocol(protocol ?? provider.protocol, { wireApi }) ??
    protocol ??
    provider.protocol;
  return getDefaultBaseUrlForProtocol(effectiveProtocol);
}

/** Describe a provider's setup steps as data for the webview wizard. */
export function describeWizardProvider(
  provider: ProviderConfig,
): AuthWizardProvider {
  const protocolStep = hasProtocolStep(provider);
  // Protocol keys as the wizard submits them: '' when there is no protocol
  // step (the provider's own protocol applies).
  const protocolKeys: Array<AuthType | undefined> = protocolStep
    ? [...provider.protocolOptions!]
    : [undefined];
  const wireApiProtocols = protocolKeys
    .filter((protocol) =>
      shouldShowStep(provider, 'wireApi', protocol ?? provider.protocol),
    )
    .map((protocol) => protocol ?? '');

  let baseUrl: AuthWizardBaseUrl = { kind: 'fixed' };
  if (shouldShowStep(provider, 'baseUrl')) {
    if (Array.isArray(provider.baseUrl)) {
      baseUrl = {
        kind: 'choice',
        stepTitle: provider.uiLabels?.baseUrlStepTitle ?? 'Endpoint',
        options: (provider.baseUrl as BaseUrlOption[]).map((opt) => ({
          value: opt.url,
          label: opt.label,
          description: opt.url,
        })),
      };
    } else {
      const placeholders: Record<string, string> = {};
      for (const protocol of protocolKeys) {
        const wireApis: Array<ModelWireApi | undefined> =
          wireApiProtocols.includes(protocol ?? '')
            ? [...WIRE_APIS]
            : [undefined];
        for (const wireApi of wireApis) {
          placeholders[authWizardRouteKey(protocol, wireApi)] =
            getBaseUrlPlaceholder(provider, protocol, wireApi);
        }
      }
      baseUrl = { kind: 'input', placeholders };
    }
  }

  return {
    id: provider.id,
    label: provider.label,
    description: provider.description,
    ...(protocolStep
      ? {
          protocols: provider.protocolOptions!.map((p) => ({
            value: String(p),
            label: PROTOCOL_LABELS[String(p)] ?? String(p),
          })),
        }
      : {}),
    wireApiProtocols,
    baseUrl,
    apiKeyPlaceholder: provider.apiKeyPlaceholder ?? 'sk-...',
    ...(shouldShowStep(provider, 'models')
      ? { models: getDefaultModelIds(provider) }
      : {}),
    advancedConfig: shouldShowStep(provider, 'advancedConfig'),
  };
}

/**
 * Auth message handler
 * Handles all authentication-related messages.
 *
 * `auth` opens the provider setup wizard in the webview; the wizard's
 * answers come back as `authWizardSubmit`. The steps are generated from the
 * shared ProviderConfig registry in core instead of hardcoding
 * provider-specific logic.
 */
export class AuthMessageHandler extends BaseMessageHandler {
  private authInteractiveHandler:
    | ((config: ProviderConfig, inputs: ProviderSetupInputs) => Promise<void>)
    | null = null;

  canHandle(messageType: string): boolean {
    return [
      'auth',
      'authWizardSubmit',
      'authWizardCancel',
      'getAccountInfo',
    ].includes(messageType);
  }

  async handle(message: { type: string; data?: unknown }): Promise<void> {
    switch (message.type) {
      case 'auth':
        this.openWizard();
        break;

      case 'authWizardSubmit':
        await this.handleWizardSubmit(message.data);
        break;

      case 'authWizardCancel':
        this.sendToWebView({ type: 'authCancelled' });
        break;

      case 'getAccountInfo':
        await this.handleGetAccountInfo();
        break;

      default:
        logger.warn('[AuthMessageHandler] Unknown message type:', message.type);
        break;
    }
  }

  /**
   * Set auth interactive handler — called with provider config and user inputs.
   */
  setAuthInteractiveHandler(
    handler: (
      config: ProviderConfig,
      inputs: ProviderSetupInputs,
    ) => Promise<void>,
  ): void {
    this.authInteractiveHandler = handler;
  }

  /**
   * Handle getAccountInfo request
   */
  private async handleGetAccountInfo(): Promise<void> {
    try {
      const info = await this.agentManager.getAccountInfo();
      this.sendToWebView({
        type: 'accountInfo',
        data: {
          authType: info.authType,
          baseUrl: info.baseUrl,
          envKey: info.apiKeyEnvKey,
          modelId: info.model,
        },
      });
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('[AuthMessageHandler] getAccountInfo failed:', error);
      this.sendToWebView({
        type: 'accountInfo',
        data: { error: errorMsg },
      });
    }
  }

  /** Open the setup wizard in the webview. */
  private openWizard(): void {
    this.sendToWebView({
      type: 'authWizard',
      data: { providers: getWizardProviders().map(describeWizardProvider) },
    });
  }

  /**
   * Reject a submission the wizard should have caught. The wizard stays open
   * and shows the message; nothing was written, so the auth state is
   * unchanged (unlike `authError`, which reports a failed connection).
   */
  private rejectSubmission(message: string): void {
    this.sendToWebView({ type: 'authWizardError', data: { message } });
  }

  // ---------------------------------------------------------------------------
  // Wizard submission — validated against the ProviderConfig
  // ---------------------------------------------------------------------------

  /**
   * Apply the wizard's answers. Always ends with `authWizardDone`: the wizard
   * closes then unless an `authWizardError` or `authError` came first (some
   * outcomes, such as saving service models only, send neither a success
   * nor an error).
   */
  private async handleWizardSubmit(data: unknown): Promise<void> {
    try {
      await this.applyWizardSubmission(
        (data ?? {}) as Partial<AuthWizardSubmission>,
      );
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('[AuthMessageHandler] auth failed:', error);
      this.sendToWebView({
        type: 'authError',
        data: { message: `Auth failed: ${errorMsg}` },
      });
    } finally {
      this.sendToWebView({ type: 'authWizardDone' });
    }
  }

  private async applyWizardSubmission(
    answers: Partial<AuthWizardSubmission>,
  ): Promise<void> {
    const provider = getWizardProviders().find(
      (p) => p.id === answers.providerId,
    );
    if (!provider) {
      logger.error(
        '[AuthMessageHandler] Provider not found:',
        answers.providerId,
      );
      this.rejectSubmission('Select a provider.');
      return;
    }

    // Step 0: Protocol (only for providers offering multiple, e.g. custom)
    let protocol: AuthType | undefined;
    if (hasProtocolStep(provider)) {
      protocol = provider.protocolOptions!.find(
        (p) => String(p) === answers.protocol,
      );
      if (!protocol) {
        this.rejectSubmission('Select an API protocol.');
        return;
      }
    }

    let wireApi: ModelWireApi | undefined;
    if (shouldShowStep(provider, 'wireApi', protocol ?? provider.protocol)) {
      wireApi = WIRE_APIS.find((api) => api === answers.wireApi);
      if (!wireApi) {
        this.rejectSubmission('Select an OpenAI API.');
        return;
      }
    }

    // Step 1: Base URL (if needed)
    let baseUrl: string;
    if (shouldShowStep(provider, 'baseUrl')) {
      if (Array.isArray(provider.baseUrl)) {
        const option = (provider.baseUrl as BaseUrlOption[]).find(
          (opt) => opt.url === answers.baseUrl,
        );
        if (!option) {
          this.rejectSubmission('Select an endpoint.');
          return;
        }
        baseUrl = option.url;
      } else {
        // A blank input means the protocol-specific default shown as the
        // placeholder (NOT a pre-filled value), so picking Anthropic/Gemini
        // doesn't silently write the OpenAI endpoint.
        const placeholder = getBaseUrlPlaceholder(provider, protocol, wireApi);
        baseUrl = (answers.baseUrl ?? '').trim() || placeholder;
        if (!/^https?:\/\//i.test(baseUrl)) {
          this.rejectSubmission(
            'Base URL must start with http:// or https://.',
          );
          return;
        }
      }
    } else {
      baseUrl = resolveBaseUrl(provider);
    }

    // Step 2: API Key
    // Trim before validation and persistence — a key pasted with trailing
    // whitespace would otherwise be stored as-is and cause silent auth
    // failures, and validateApiKey could reject in VS Code what the CLI
    // (which trims) accepts.
    const apiKey = (answers.apiKey ?? '').trim();
    if (!apiKey) {
      this.rejectSubmission('API key is required.');
      return;
    }

    // Validate API key if provider has validation
    if (provider.validateApiKey) {
      const validationError = provider.validateApiKey(apiKey, baseUrl);
      if (validationError) {
        this.rejectSubmission(validationError);
        return;
      }
    }

    // Step 3: Model selection (if needed)
    let modelIds: string[];
    if (shouldShowStep(provider, 'models')) {
      modelIds = (answers.models ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (modelIds.length === 0) {
        // E.g. user typed only whitespace/commas like ", , ,".
        this.rejectSubmission('Model IDs cannot be empty.');
        return;
      }
    } else {
      modelIds = getDefaultModelIds(provider);
    }

    // Step 4: Advanced config (if needed) — the thinking mode question
    let advancedConfig: ProviderSetupInputs['advancedConfig'];
    if (shouldShowStep(provider, 'advancedConfig')) {
      if (typeof answers.enableThinking !== 'boolean') {
        this.rejectSubmission('Choose whether to enable thinking mode.');
        return;
      }
      advancedConfig = { enableThinking: answers.enableThinking };
    }

    // Submit
    if (!this.authInteractiveHandler) {
      logger.error(
        '[AuthMessageHandler] authInteractiveHandler not set; cannot apply provider config.',
      );
      this.sendToWebView({
        type: 'authError',
        data: {
          message:
            'Auth handler not initialized. Please reopen the panel and try again.',
        },
      });
      return;
    }
    await this.authInteractiveHandler(provider, {
      protocol,
      ...(wireApi ? { wireApi } : {}),
      baseUrl,
      apiKey,
      modelIds,
      advancedConfig,
    });
  }
}
