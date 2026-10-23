/**
 * What MariaDB Code tells other parties about itself: the User-Agent sent to model providers,
 * GitHub and connection warm-ups, the client name sent to MCP servers, the agent name in the ACP
 * handshake, and the system-wide settings paths. Upstream names Qwen Code in all of them.
 */
import {
  DOCS_DIRS,
  DOCS_EXTENSIONS,
  SHIPPED_DIRS,
  patch,
  replaceInTracked,
} from './lib.mjs';

export function apply() {
  // Code, tests and docs (the bundled help skill and the user docs name the system paths).
  replaceInTracked(
    'outbound identity',
    [...SHIPPED_DIRS, ...DOCS_DIRS],
    [
      // `QwenCode/<version> (<os>; <arch>)` and the preconnect agent.
      [/\bQwenCode(?=\/|-Preconnect\/)/g, 'MariaDBCode'],
      // Skill and runtime downloads (`'User-Agent': 'qwen-code'`, `` `qwen-code/${version}` ``).
      [/('User-Agent': ['`])qwen-code(?=['`/])/g, '$1mariadb-code'],
      // MCP client name sent in every MCP initialize request.
      ['qwen-cli-mcp-client-', 'mariadb-code-mcp-client-'],
      // System-wide settings (macOS, Windows, Linux).
      ['Application Support/QwenCode', 'Application Support/MariaDBCode'],
      ['ProgramData\\\\qwen-code', 'ProgramData\\\\mariadb-code'],
      ['ProgramData\\qwen-code', 'ProgramData\\mariadb-code'],
      ['/etc/qwen-code', '/etc/mariadb-code'],
    ],
    {
      extensions: DOCS_EXTENSIONS,
      skip: [/^packages\/vscode-ide-companion\/README\.md$/],
    },
  );
  patch(
    'acp agent name',
    'packages/cli/src/acp-integration/acpAgent.ts',
    /(agentInfo: \{\n\s+name: )'qwen-code'/,
    "$1'mariadb-code'",
    (t) => /agentInfo: \{\n\s+name: 'mariadb-code'/.test(t),
  );
}
