/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Upstream tests of behaviour MariaDB Shell Agent deliberately does not have. Each entry names the
 * reason; a title upstream renames or deletes stops the rebrand, so the list cannot go stale.
 * Keep it short: a test that fails because a rule renamed something inconsistently is a rule bug,
 * not an entry here.
 */
import { skipTests } from './lib.mjs';

const SKIPPED = [
  {
    reason: 'Usage statistics are off by default (alibaba.mjs).',
    tests: {
      // Its "no opt-out" case expects no refresh switch in the sandbox handoff; with statistics
      // off by default the handoff always carries "off" (the catalog refresh needs statistics on).
      'packages/cli/src/llm.test.tsx': [
        'carries the operator catalog refresh opt-out into the sandbox handoff (%s)',
      ],
      'packages/core/src/config/config.test.ts': [
        'defaults usage statistics to enabled if not specified',
      ],
      'packages/core/src/extension/extensionManager.test.ts': [
        'keeps usage statistics enabled by default when the option is omitted',
      ],
      'packages/core/src/telemetry/config.test.ts': [
        'defaults to true when neither env nor settings are set',
      ],
    },
  },
  {
    reason:
      'Self-update is off by default and has no download sources (alibaba.mjs): no update check on startup, /update reports that updates are off.',
    tests: {
      'packages/cli/src/startup/startup-prefetch.test.ts': [
        'records completed profiler lifecycle events for successful deferred tasks',
        'waits UPDATE_CHECK_DELAY_MS before checking for updates',
        'installs npm updates in the background after first render',
        'keeps manual guidance for npm installs without an update command',
        'prompts non-npm installs when no parent supervisor is available',
        'defers standalone updates until the session exits',
        'keeps a container running until the user updates the host',
        'keeps a container running when the host requires manual updates',
        'starts post-render tasks without awaiting completion',
        'surfaces update check errors as a warning through the update event emitter',
        'reports a timeout-specific reason when the update check times out',
        'reports an offline-specific reason when the registry is unreachable',
        'swallows deferred task failures',
        'starts post-render prefetch only once per config',
      ],
      'packages/cli/src/ui/commands/update-command.test.ts': [
        'hands an interactive update off to the parent process',
        'hands standalone updates off to the parent process',
        'does not mutate enableAutoUpdate when relaunching throws',
        'uses the host update capability inside a container',
        'updates standalone installs in non-interactive mode',
        'returns deferred message when standalone update is not yet active',
        'returns an error when standalone update fails in non-interactive mode',
      ],
      'packages/cli/src/ui/standalone-update.test.ts': [
        'preserves default fallback when unset (%s)',
      ],
      // Two concurrent prepares: one settings read can miss the test's mock and see no
      // enableAutoUpdate, which upstream treats as on.
      'packages/cli/src/serve/routes/daemon-update.test.ts': [
        'stages one download without activation and retains readiness across app replacement',
      ],
    },
  },
  {
    reason:
      'No Alibaba providers in the pickers (alibaba.mjs): no QwenCloud / Alibaba ModelStudio groups or menu entries.',
    tests: {
      // Navigates the CLI auth menu by position through the QwenCloud and ModelStudio entries.
      'packages/cli/src/ui/auth/AuthDialog.test.tsx': '*',
      'packages/cli/src/ui/opentui/dialogs-auth.test.tsx': [
        'renders the main menu with the four top-level options',
        'navigates main → sub-menu and back with Esc',
        'wraps the main-menu cursor from the last row to the first (#160)',
        'renders QwenCloud flow title in Chinese when locale is zh (T1)',
        'shows Token Plan and Standard API Key in QwenCloud sub-menu but not Coding Plan (T3+T4)',
        'sheds the rule and terms block before the main list loses its last row',
        'sheds the main list margin row before the list loses its last row',
      ],
      'packages/cli/src/serve/server/auth-provider-helpers.test.ts': [
        'lists QwenCloud first and pins every group membership',
      ],
      'packages/core/src/providers/__tests__/presets/qwencloud-standard.test.ts':
        ['is registered, and the qwencloud group excludes Coding Plan'],
      'packages/core/src/providers/__tests__/presets/qwencloud-token-plan.test.ts':
        ['is registered in the qwencloud access-method group'],
    },
  },
  {
    reason:
      'Only OpenRouter, Requesty, OpenAI, Grok and Custom are offered (OFFERED_PROVIDER_IDS in alibaba.mjs): DeepSeek and Kimi are not in the pickers or provider lists.',
    tests: {
      // Walks the third-party sub-menu to DeepSeek, which upstream lists first.
      'packages/cli/src/ui/opentui/dialogs-auth.test.tsx': [
        'applies every tick of a held Space to the same checkbox',
        'charges the Shell title the rows it wraps into at a narrow width',
        'clips a model label to the one physical row its charge pays',
        'filters the recommended list from the search field one Tab away',
        'lands the Space on the row the arrows of the same read reached',
        'refuses the recommended rows a short region cannot paint',
        'refuses the sub-menu keys when the region pays zero provider rows',
        'submits the tick made in the same read as Enter',
        'toggles the row an arrow of the same read moved to',
        'windows the provider sub-menu from the region, so Enter only opens a painted provider',
      ],
      // Its core mock registers only DeepSeek.
      'packages/cli/src/acp-integration/acpAgent.test.ts': [
        'qwen/providers extension methods list and connect model providers',
        'qwen/providers/list exposes API prefill for %s',
        'qwen/providers/list includes existing provider settings',
      ],
      'packages/core/src/providers/__tests__/presets/moonshot.test.ts': [
        'is registered and discoverable in the provider registry',
      ],
    },
  },
  {
    reason:
      'No app-attribution headers for OpenRouter and Requesty (alibaba.mjs).',
    tests: {
      'packages/core/src/providers/__tests__/presets/openrouter.test.ts': [
        'declares customHeaders for attribution',
      ],
      'packages/core/src/providers/__tests__/presets/requesty.test.ts': [
        'declares customHeaders for attribution',
      ],
    },
  },
  {
    reason:
      'No QwenLM endpoints (alibaba.mjs): web fetch does not pre-approve QwenLM GitHub.',
    tests: {
      'packages/core/src/tools/web-fetch-preapproved.test.ts': [
        'matches path-scoped entries only within the path prefix',
        'matches path prefixes case-insensitively',
      ],
    },
  },
  {
    reason:
      "Upstream's GitHub workflows are removed (github.mjs): these tests read the autofix and PR review workflows.",
    tests: {
      'packages/cli/src/commands/review/lib/review-footer.test.ts': [
        'agrees with the autofix census filter, which is a second spelling of the same shape',
      ],
      'packages/cli/src/commands/review/lib/deadline.test.ts': [
        'the workflow exports the exact env names the gate reads',
      ],
    },
  },
];

export function apply() {
  for (const { tests } of SKIPPED) {
    for (const [file, titles] of Object.entries(tests)) {
      skipTests('skipped tests', file, titles);
    }
  }
}
