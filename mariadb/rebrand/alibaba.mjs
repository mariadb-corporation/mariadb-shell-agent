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
// Not an endpoint: the Kubernetes CSI driver name in the managed-runtime storage protocol,
// validated against pinned contract documents (allowlisted in mariadb/leak-allowlist.json).
const CSI_DRIVER_PREFIX = 'diskplugin.csi.';
function neutralizeDomain(match, name, dot, tld, offset, line) {
  if (!ALIBABA_DOMAINS.includes(`${name}.${tld}`.toLowerCase())) return match;
  if (
    line.slice(offset - CSI_DRIVER_PREFIX.length, offset) === CSI_DRIVER_PREFIX
  )
    return match;
  return `${name}${dot}${tld === tld.toUpperCase() ? 'INVALID' : 'invalid'}`;
}

// QwenLM's GitHub organisation, docs site and container registry: release downloads for
// self-update, the Live host and the managed runtime, and the sandbox image.
// Plain and escaped spellings (`github\.com\/QwenLM` inside a regex) are matched; only the
// top-level domain changes, so escapes stay intact.
const sep = (ch) => '\\\\{0,2}\\' + ch;
const urlRe = (url, { before = '', after = '' } = {}) =>
  new RegExp(before + url.replace(/[./]/g, sep) + after, 'gi');
const toInvalid = (m) => m.replace(/(com|io)(?=\\{0,2}\/|$)/i, 'invalid');
export const QWENLM_PAIRS = [
  [urlRe('api.github.com/repos/QwenLM', { after: String.raw`\b` }), toInvalid],
  [
    urlRe('raw.githubusercontent.com/QwenLM', { after: String.raw`\b` }),
    toInvalid,
  ],
  [
    urlRe('github.com/QwenLM', {
      before: String.raw`(?<![\w.-])`,
      after: String.raw`\b`,
    }),
    toInvalid,
  ],
  // Not the JSON-schema $ids of the managed-runtime contracts: identifiers, never fetched, and
  // the contract documents are validated against them.
  [
    urlRe('qwenlm.github.io', {
      after: `(?!${sep('/')}qwen-code${sep('/')}contracts)`,
    }),
    toInvalid,
  ],
  [urlRe('ghcr.io/qwenlm', { after: String.raw`\b` }), toInvalid],
];

// Providers run by Alibaba; the rest (DeepSeek, Grok, MiniMax, Z.AI, Kimi, OpenRouter,
// Requesty, custom OpenAI-compatible) stay.
const DROPPED_GROUPS = ['qwencloud', 'alibaba'];
const DROPPED_IDS = ['idealab', 'modelscope'];

// The /review tests use QwenLM GitHub URLs as sample data (PR URLs, remotes) for code that works
// with any repository; elsewhere tests assert the product's own URLs and follow the source.
// (sandboxed-exec.test.ts asserts the sandbox image constant, so it follows the source.)
const SAMPLE_DATA = [
  /^packages\/cli\/src\/commands\/review\/(?!lib\/sandboxed-exec\.test\.).*\.test\.[cm]?[jt]sx?$/,
];
export function apply() {
  const readme = /^packages\/vscode-ide-companion\/README\.md$/;
  replaceInTracked(
    'alibaba hosts',
    [...SHIPPED_DIRS, ...DOCS_DIRS],
    [[DOMAIN_RE, neutralizeDomain]],
    {
      extensions: DOCS_EXTENSIONS,
      // Our own README, which credits the upstream project.
      skip: [readme],
    },
  );
  replaceInTracked(
    'qwenlm urls',
    [...SHIPPED_DIRS, ...DOCS_DIRS],
    QWENLM_PAIRS,
    {
      extensions: DOCS_EXTENSIONS,
      skip: [readme, ...SAMPLE_DATA],
    },
  );
  // The sandbox image (config.sandboxImageUri) is QwenLM's.
  replaceInTracked('qwenlm urls', ['package.json'], QWENLM_PAIRS, {
    extensions: CODE_EXTENSIONS,
  });

  // The Alibaba presets stay registered (code such as reasoning overrides and the extension's
  // plan definitions looks them up, and their hosts no longer resolve), but no picker or provider
  // list offers them.
  const visible = `(p) => !${JSON.stringify(DROPPED_GROUPS).replaceAll('"', "'")}.includes(p.uiGroup ?? '') && !${JSON.stringify(DROPPED_IDS).replaceAll('"', "'")}.includes(p.id)`;
  patch(
    'provider picker groups',
    'packages/core/src/providers/all-providers.ts',
    /export const (QWENCLOUD|ALIBABA|THIRD_PARTY)_PROVIDERS = ALL_PROVIDERS\.filter\(/g,
    (_, group) =>
      `export const ${group}_PROVIDERS = ALL_PROVIDERS.filter(${visible}).filter(`,
    (t) => t.includes(`ALL_PROVIDERS.filter(${visible}).filter(`),
  );
  patch(
    'acp provider list',
    'packages/cli/src/acp-integration/acpAgent.ts',
    'providers: ALL_PROVIDERS.map((provider) =>',
    `providers: ALL_PROVIDERS.filter(${visible}).map((provider) =>`,
    (t) => t.includes(`providers: ALL_PROVIDERS.filter(${visible})`),
  );
  patch(
    'web shell provider catalog',
    'packages/cli/src/serve/server/auth-provider-helpers.ts',
    'const providers = ALL_PROVIDERS.map(buildAuthProviderDescriptor);',
    `const providers = ALL_PROVIDERS.filter(${visible}).map(buildAuthProviderDescriptor);`,
    (t) =>
      t.includes(
        `ALL_PROVIDERS.filter(${visible}).map(buildAuthProviderDescriptor)`,
      ),
  );
  patch(
    'web shell provider groups',
    'packages/cli/src/serve/server/auth-provider-helpers.ts',
    /\n {6}\{\n {8}id: '(?:qwencloud|alibaba)',[\s\S]*?\n {6}\},/g,
    '',
    (t) => !/id: '(?:qwencloud|alibaba)',/.test(t),
  );
  // No app-attribution headers (upstream identifies itself as Qwen Code with a QwenLM link;
  // OpenRouter publishes app rankings from them).
  for (const file of [
    'packages/core/src/providers/presets/openrouter.ts',
    'packages/core/src/providers/presets/requesty.ts',
  ]) {
    patch(
      'attribution headers',
      file,
      /\n {2}customHeaders: \{\n[^}]*\n {2}\},/,
      '',
      (t) => !t.includes('customHeaders:'),
    );
  }

  for (const file of [
    'packages/cli/src/ui/auth/AuthDialog.tsx',
    'packages/cli/src/ui/opentui/dialogs-auth.tsx',
  ]) {
    patch(
      'auth dialog main menu',
      file,
      /\n {2}\{\n {4}key: '(?:QWENCLOUD|ALIBABA_MODELSTUDIO)',[\s\S]*?\n {2}\},/g,
      '',
      (t) => !/\n {4}key: '(?:QWENCLOUD|ALIBABA_MODELSTUDIO)',/.test(t),
    );
  }

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
  // Standalone entry points resolve the default through their own helper.
  patch(
    'telemetry default (resolver)',
    'packages/core/src/telemetry/config.ts',
    /(settingsValue \?\?\s*)true\b/,
    '$1false',
    (t) => /settingsValue \?\?\s*false\b/.test(t),
  );
  // Even when a user opts in, nothing names Alibaba: a neutral, unresolvable endpoint and no
  // Alibaba analytics app id.
  patch(
    'telemetry endpoint',
    'packages/core/src/telemetry/qwen-logger/qwen-logger.ts',
    /const USAGE_STATS_HOSTNAME = '[^']*';/,
    "const USAGE_STATS_HOSTNAME = 'usage-statistics.invalid';",
    (t) =>
      t.includes("const USAGE_STATS_HOSTNAME = 'usage-statistics.invalid';"),
  );
  replaceInTracked(
    'telemetry endpoint',
    ['packages/core/src/telemetry/qwen-logger'],
    [
      [
        /gb4w8c3ygj-default-sea\.rum\.aliyuncs\.(?:com|invalid)/g,
        'usage-statistics.invalid',
      ],
      // NO_PROXY suffix test of the upload host.
      [/'\.rum\.aliyuncs\.(?:com|invalid)'/g, "'.invalid'"],
    ],
  );
  patch(
    'telemetry app id',
    'packages/core/src/telemetry/qwen-logger/qwen-logger.ts',
    /const RUN_APP_ID = '[^']*';/,
    "const RUN_APP_ID = '';",
    (t) => t.includes("const RUN_APP_ID = '';"),
  );

  // loadCliConfig's table test asserts the default; it now asserts ours.
  patch(
    'telemetry default test',
    'packages/cli/src/config/config.test.ts',
    "['defaults to enabled', undefined, undefined, true],",
    "['defaults to disabled', undefined, undefined, false],",
    (t) => t.includes("['defaults to disabled', undefined, undefined, false],"),
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
