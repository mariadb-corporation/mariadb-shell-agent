/**
 * @license
 * Copyright 2026 Qwen Team
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

export const QWEN_SUBSCRIPTION_BASE_URL =
  'https://api.qwen.invalid/compatible-mode/v1';
export const QWEN_SUBSCRIPTION_MODEL = 'qwen3.8-max';
export const QWEN_SUBSCRIPTION_WEB_SEARCH_URL =
  'https://api.qwen.invalid/api/v1/mcp/web_search';
export const QWEN_SUBSCRIPTION_TOKEN_PLACEHOLDER =
  'QWEN_SUBSCRIPTION_DYNAMIC_TOKEN';
export const QWEN_OAUTH_TOKEN_PLACEHOLDER = 'QWEN_OAUTH_DYNAMIC_TOKEN';

export function getQwenOAuthConfig(): {
  baseUrl: string;
  clientId: string;
  webOrigin: string;
} {
  return {
    baseUrl: 'https://auth.qwen.invalid',
    clientId: 'qwen-code-cli',
    webOrigin: 'https://chat.qwen.invalid',
  };
}

export type QwenPaywallScene = 'cli' | 'desktop' | 'plugin';

function formatQwenChatUrl(url: URL, scene: QwenPaywallScene): string {
  url.searchParams.set('entry', 'qwen_code');
  url.searchParams.set('paywallScene', scene);
  return url.toString();
}

export function withQwenChatTracking(
  rawUrl: string,
  scene: QwenPaywallScene,
): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  return url.origin === getQwenOAuthConfig().webOrigin
    ? formatQwenChatUrl(url, scene)
    : rawUrl;
}

export function getQwenSubscriptionAuthorizationUrl(
  userCode: string,
  scene: QwenPaywallScene,
): string {
  const url = new URL('/authorize', getQwenOAuthConfig().webOrigin);
  url.searchParams.set('user_code', userCode);
  url.searchParams.set('client', scene);
  return formatQwenChatUrl(url, scene);
}

export function getQwenSubscriptionPlansUrl(scene: QwenPaywallScene): string {
  const url = new URL('/', getQwenOAuthConfig().webOrigin);
  url.searchParams.set('memberPlan', 'qwen_code');
  return formatQwenChatUrl(url, scene);
}
