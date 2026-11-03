/**
 * @license
 * Copyright 2026 Qwen Team
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Flags forwarded to a spawned `mariadb-shell-agent --acp` child. Shared by `runQwenServe`
 * (injected channel factory) and `createServeApp`'s default bridge spawn.
 */
export function acpChildExtraArgs(opts: {
  experimentalLsp?: boolean;
  restoreAskUserQuestion?: boolean;
}): string[] | undefined {
  const extraArgs = [
    ...(opts.experimentalLsp === true ? ['--experimental-lsp'] : []),
    ...(opts.restoreAskUserQuestion === true
      ? ['--restore-ask-user-question']
      : []),
  ];
  return extraArgs.length > 0 ? extraArgs : undefined;
}
