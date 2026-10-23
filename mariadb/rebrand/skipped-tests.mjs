/**
 * Upstream tests of behaviour MariaDB Code deliberately does not have. Each entry names the
 * reason; a title upstream renames or deletes stops the rebrand, so the list cannot go stale.
 * Keep it short: a test that fails because a rule renamed something inconsistently is a rule bug,
 * not an entry here.
 */
import { skipTests } from './lib.mjs';

const SKIPPED = [
  {
    reason: 'Usage statistics are off by default (alibaba.mjs).',
    tests: {
      'packages/core/src/config/config.test.ts': [
        'defaults usage statistics to enabled if not specified',
      ],
      'packages/core/src/extension/extensionManager.test.ts': [
        'keeps usage statistics enabled by default when the option is omitted',
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
      'packages/vscode-ide-companion/src/webview/handlers/AuthMessageHandler.test.ts':
        ['lists QwenCloud as the first provider group in the picker'],
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
];

export function apply() {
  for (const { tests } of SKIPPED) {
    for (const [file, titles] of Object.entries(tests)) {
      skipTests('skipped tests', file, titles);
    }
  }
}
