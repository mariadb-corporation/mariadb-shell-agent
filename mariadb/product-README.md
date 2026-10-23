# MariaDB Code

MariaDB Code is an AI coding agent for the terminal and for VS Code, built by MariaDB on
[Qwen Code](https://github.com/QwenLM/qwen-code).

- Command: `mariadb-code` (short: `mdbc`)
- Settings: `~/.mariadb-code/settings.json`, per project `.mariadb-code/settings.json`
- Project instructions: `MARIADB-CODE.md` (`AGENTS.md` is read too)
- Ignore rules: `.mariadb-codeignore`
- Environment: every `QWEN_<X>` setting can also be given as `MARIADB_CODE_<X>`

Model providers: DeepSeek, Grok, MiniMax, Z.AI, Kimi, OpenRouter, Requesty, or any
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

Usage statistics and self-update are off, and MariaDB Code contacts no Alibaba services.

How this fork is maintained (rebasing on upstream, branding rules, checks): `mariadb/README.md`.

Apache-2.0, like upstream Qwen Code.
