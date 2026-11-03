# MariaDB Shell Agent

MariaDB Shell Agent is an AI agent for MariaDB in the terminal and in VS Code, built by MariaDB on
[Qwen Code](https://github.com/QwenLM/qwen-code).

- Command: `mariadb-shell-agent` (short: `msa`)
- Settings: `~/.mariadb-shell-agent/settings.json`, per project `.mariadb-shell-agent/settings.json`
- Project instructions: `MARIADB-SHELL-AGENT.md` (`AGENTS.md` is read too)
- Ignore rules: `.mariadb-shell-agentignore`
- Environment: every `QWEN_<X>` setting can also be given as `MARIADB_SHELL_AGENT_<X>`

Model providers: OpenRouter, Requesty, OpenAI, Grok (xAI), or any
OpenAI-compatible endpoint (including local servers):

```json
{
  "env": { "LOCAL_API_KEY": "not-needed" },
  "modelProviders": {
    "openai": [
      {
        "id": "my-model",
        "envKey": "LOCAL_API_KEY",
        "baseUrl": "http://127.0.0.1:8090/v1"
      }
    ]
  },
  "security": { "auth": { "selectedType": "openai" } },
  "model": { "name": "my-model" }
}
```

Usage statistics and self-update are off, and MariaDB Shell Agent contacts no Alibaba services.

How this fork is maintained (rebasing on upstream, branding rules, checks): `mariadb/README.md`.

Apache-2.0, like upstream Qwen Code.
