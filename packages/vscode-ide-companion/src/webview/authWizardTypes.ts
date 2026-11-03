/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Messages of the provider setup wizard, shared by the extension host
 * (AuthMessageHandler) and the webview (AuthWizard).
 *
 * The host owns the provider registry and sends each offered provider's
 * steps as plain data (`authWizard`); the webview walks the user through
 * them and posts the answers back (`authWizardSubmit`), which the host
 * validates the same way before writing settings.
 */

export interface AuthWizardChoice {
  value: string;
  label: string;
  description?: string;
}

export type AuthWizardWireApi = 'chat-completions' | 'responses';

export type AuthWizardBaseUrl =
  | { kind: 'fixed' }
  | { kind: 'choice'; stepTitle: string; options: AuthWizardChoice[] }
  | {
      kind: 'input';
      /**
       * Placeholder (and value used for a blank input) per route, keyed by
       * `authWizardRouteKey(protocol, wireApi)`.
       */
      placeholders: Record<string, string>;
    };

export interface AuthWizardProvider {
  id: string;
  label: string;
  description: string;
  /** Protocol step choices; absent when the provider has one protocol. */
  protocols?: AuthWizardChoice[];
  /**
   * Protocols whose setup asks which OpenAI API to use. `''` stands for the
   * provider's own protocol when there is no protocol step.
   */
  wireApiProtocols: string[];
  baseUrl: AuthWizardBaseUrl;
  apiKeyPlaceholder: string;
  /** Default model IDs; present when the models step is shown. */
  models?: string[];
  /** Whether the advanced step (thinking mode) is shown. */
  advancedConfig: boolean;
}

export interface AuthWizardSubmission {
  providerId: string;
  protocol?: string;
  wireApi?: AuthWizardWireApi;
  baseUrl?: string;
  apiKey: string;
  /** Comma-separated model IDs, as typed. */
  models?: string;
  enableThinking?: boolean;
}

/** Key of `AuthWizardBaseUrl.placeholders` for a protocol + API choice. */
export function authWizardRouteKey(
  protocol: string | undefined,
  wireApi: AuthWizardWireApi | undefined,
): string {
  return `${protocol ?? ''}|${wireApi ?? ''}`;
}
