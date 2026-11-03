/**
 * @license
 * Copyright 2025 Qwen Team
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionOrganizationService } from '@qwen-code/qwen-code-core';
import { writeStderrLine } from '../utils/stdioHelpers.js';

export function createSessionOrganizationService(
  workspaceCwd: string,
): SessionOrganizationService {
  return new SessionOrganizationService(workspaceCwd, (message) => {
    writeStderrLine(`mariadb-shell-agent serve: session-org: ${message}`);
  });
}
