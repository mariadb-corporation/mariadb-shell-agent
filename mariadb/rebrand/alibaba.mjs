/**
 * No Alibaba endpoints: the Alibaba-run model providers are dropped, every Alibaba or QwenLM host
 * in shipped code and docs is made unresolvable, and self-update and usage statistics are off
 * unless a user turns them on explicitly (with nowhere left to send to).
 */
import {
  DOCS_DIRS,
  DOCS_EXTENSIONS,
  CODE_EXTENSIONS,
  SHIPPED_DIRS,
  patch,
  patchJson,
  replaceInTracked,
} from './lib.mjs';

// Hosts run by Alibaba (Alibaba Cloud, DashScope/ModelStudio, Qwen chat/OAuth, QwenCloud,
// ModelScope, Alibaba-internal services). The top-level domain becomes ".invalid" (RFC 6761: never
// resolves), so code that still names one fails fast, and the leak scanner can spot it.
const ALIBABA_DOMAINS = [
  'aliyuncs.com',
  'aliyun.com',
  'aliyun-inc.com',
  'alibabacloud.com',
  'alibaba-inc.com',
  'alibaba.com',
  'alicdn.com',
  'qwen.ai',
  'qwen.com',
  'qwencloud.com',
  'qwencloudapi.com',
  'modelscope.cn',
  'modelscope.ai',
];
// Also matches the escaped spellings in regex literals and regex strings (`aliyuncs\.com`).
const DOMAIN_RE = new RegExp(
  `(?<![A-Za-z0-9-])(${ALIBABA_DOMAINS.map((d) => d.split('.')[0]).join('|')})(\\\\{0,2}\\.)(com|cn|ai)(?![A-Za-z0-9-])`,
  'gi',
);
function neutralizeDomain(match, name, dot, tld) {
  if (!ALIBABA_DOMAINS.includes(`${name}.${tld}`.toLowerCase())) return match;
  return `${name}${dot}${tld === tld.toUpperCase() ? 'INVALID' : 'invalid'}`;
}

// QwenLM's GitHub organisation, docs site and container registry: release downloads for
// self-update, the Live host and the managed runtime, and the sandbox image.
const QWENLM_PAIRS = [
  [/api\.github\.com\/repos\/QwenLM\b/gi, 'api.github.invalid/repos/QwenLM'],
  [
    /raw\.githubusercontent\.com\/QwenLM\b/gi,
    'raw.githubusercontent.invalid/QwenLM',
  ],
  [/(?<![\w.-])github\.com\/QwenLM\b/gi, 'github.invalid/QwenLM'],
  [/qwenlm\.github\.io/gi, 'qwenlm.github.invalid'],
  [/ghcr\.io\/qwenlm\b/gi, 'ghcr.invalid/qwenlm'],
];

// Providers run by Alibaba; the rest (DeepSeek, Grok, MiniMax, Z.AI, Kimi, OpenRouter,
// Requesty, custom OpenAI-compatible) stay.
const DROPPED_GROUPS = ['qwencloud', 'alibaba'];
const DROPPED_IDS = ['idealab', 'modelscope'];

export function apply() {
  replaceInTracked('alibaba hosts', SHIPPED_DIRS, [
    [DOMAIN_RE, neutralizeDomain],
    ...QWENLM_PAIRS,
  ]);
  replaceInTracked(
    'alibaba hosts',
    [...SHIPPED_DIRS, ...DOCS_DIRS],
    [[DOMAIN_RE, neutralizeDomain], ...QWENLM_PAIRS],
    {
      extensions: DOCS_EXTENSIONS,
      // Our own README, which credits the upstream project.
      skip: [/^packages\/vscode-ide-companion\/README\.md$/],
    },
  );
  // The sandbox image (config.sandboxImageUri) is QwenLM's.
  replaceInTracked('alibaba hosts', ['package.json'], QWENLM_PAIRS, {
    extensions: CODE_EXTENSIONS,
  });

  patch(
    'alibaba providers',
    'packages/core/src/providers/all-providers.ts',
    /export const ALL_PROVIDERS: readonly ProviderConfig\[\] = \[([\s\S]*?)\n\];/,
    (_, list) =>
      `const UPSTREAM_PROVIDERS: readonly ProviderConfig[] = [${list}\n];\n\n` +
      `// MariaDB Code: no providers run by Alibaba.\n` +
      `export const ALL_PROVIDERS: readonly ProviderConfig[] =\n` +
      `  UPSTREAM_PROVIDERS.filter(\n` +
      `    (p) =>\n` +
      `      !${JSON.stringify(DROPPED_GROUPS).replaceAll('"', "'")}.includes(p.uiGroup ?? '') &&\n` +
      `      !${JSON.stringify(DROPPED_IDS).replaceAll('"', "'")}.includes(p.id),\n` +
      `  );`,
    (t) => t.includes('const UPSTREAM_PROVIDERS'),
  );

  // The extension's Coding Plan settings (provider, API key, region) only drive the Alibaba
  // Coding Plan sync; without them in the manifest the sync never runs.
  patchJson(
    'extension coding plan settings',
    'packages/vscode-ide-companion/package.json',
    (pkg) => {
      const props = pkg.contributes?.configuration?.properties;
      if (!props) return false;
      for (const key of [
        'qwen-code.provider',
        'qwen-code.apiKey',
        'qwen-code.codingPlanRegion',
      ]) {
        delete props[key];
      }
    },
  );
  replaceInTracked(
    'extension onboarding providers',
    ['packages/vscode-ide-companion/src'],
    [
      [
        'Supports Coding Plan, ModelStudio API Key, and OpenAI-compatible providers.',
        'Supports DeepSeek, Kimi, OpenRouter and other OpenAI-compatible providers.',
      ],
      [
        '支持 Coding Plan、百炼 API Key 以及兼容 OpenAI 的服务商。',
        '支持 DeepSeek、Kimi、OpenRouter 及其他兼容 OpenAI 的服务商。',
      ],
    ],
  );

  // Usage statistics and self-update: off unless set to true.
  replaceInTracked(
    'telemetry default',
    ['packages/cli/src', 'packages/core/src'],
    [[/(usageStatisticsEnabled\s*\?\?\s*)true\b/g, '$1false']],
  );
  replaceInTracked(
    'auto-update default',
    ['packages/cli/src'],
    [[/(general\?\.enableAutoUpdate) !== false/g, '$1 === true']],
  );
  patch(
    'settings schema defaults',
    'packages/cli/src/config/settingsSchema.ts',
    /((?:enableAutoUpdate|usageStatisticsEnabled): \{[^}]*?default: )true/g,
    '$1false',
    (t) =>
      !/(?:enableAutoUpdate|usageStatisticsEnabled): \{[^}]*?default: true/.test(
        t,
      ),
  );

  // The extension's copy of the settings schema, generated from settingsSchema.ts on install.
  patch(
    'settings schema json defaults',
    'packages/vscode-ide-companion/schemas/settings.schema.json',
    /("(?:enableAutoUpdate|usageStatisticsEnabled)": \{[^}]*?"default": )true/g,
    '$1false',
    (t) =>
      !/"(?:enableAutoUpdate|usageStatisticsEnabled)": \{[^}]*?"default": true/.test(
        t,
      ),
  );

  // npm self-update looks up the package's own name; upstream's is on npm, ours is not.
  patch(
    'dist package name',
    'scripts/prepare-package.js',
    'name: rootPackageJson.name,',
    "name: '@mariadb/mariadb-code',",
    (t) => t.includes("name: '@mariadb/mariadb-code',"),
  );
}
