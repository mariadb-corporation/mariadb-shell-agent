# Authentication

MariaDB Shell Agent’s first-run `/auth` menu has five top-level options. Pick the one that matches how you want to run the CLI:

- [**Qwen Account with Subscription**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli): sign in with your Qwen account through **Qwen OAuth** to access **MariaDB Shell Agent and Agent** with your **Plus or Pro subscription** from [**chat.qwen.invalid**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli). If you don’t have a subscription yet, visit [**chat.qwen.invalid**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli) to subscribe to Plus or Pro, then return to MariaDB Shell Agent and select [**Qwen Account with Subscription**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli).
- **QwenCloud**: official recommended setup. Opens a sub-menu with **Token Plan** (subscription with a monthly Credit quota · dedicated endpoint, Personal and Team editions) or **Standard API Key** (pay-as-you-go). You then pick the platform explicitly — **China — 千问AI平台** or **International — QwenCloud** — so the UI language never decides your endpoint. Both access methods also enable the built-in [`web_search` tool](https://qwenlm.github.invalid/qwen-code-docs/en/developers/tools/web-search/) with no extra setup.
- **Alibaba ModelStudio**: opens a sub-menu with **Coding Plan** (for individual developers · weekly quota included), **Token Plan** (for teams and companies · usage-based billing with a dedicated endpoint), or **Standard API Key** (connect with an existing ModelStudio API key). Token Plan and Standard API Key also enable the built-in [`web_search` tool](https://qwenlm.github.invalid/qwen-code-docs/en/developers/tools/web-search/) with no extra setup. Saved ModelStudio credentials, endpoints and models keep working unchanged.
- **Third-party Providers**: choose a built-in provider and connect with an API key (DeepSeek, Grok, MiniMax, Z.AI, Kimi, Idealab, ModelScope, OpenRouter, Requesty).
- **Custom Provider**: connect a local server, proxy, or unsupported provider — supports OpenAI, Anthropic, Gemini, and other compatible endpoints.

For a custom OpenAI-compatible (Chat Completions or Responses) or Anthropic
connection, the CLI fetches available model IDs after you enter the base URL and
API key. This authenticated request happens before saving and has a five-second
timeout. The model step supports search, Space to toggle candidates, and Tab or
arrow keys to move between manual input, search and the list. Enter confirms
your choices; configuration is saved only after the final review. Esc cancels
loading or goes back. Re-entering the step fetches a fresh list.

If the endpoint cannot list models, enter IDs manually as before. Gemini retains
manual entry. Discovery adds no background polling and does not infer model
capabilities: use Advanced Config for explicit limits or modalities. Custom
discovery does not follow redirects with your API key.

This workflow is available in both Ink and OpenTUI. To try the local OpenTUI
build, run the bundle with Bun and explicitly select the renderer:

```bash
QWEN_TUI_RENDERER=opentui QWEN_TUI_RENDERER_STRICT=1 bun dist/cli.js
```

Then use `/auth` → **Custom Provider**. Strict renderer selection reports a
startup failure instead of silently falling back to Ink.

## **Option 1: Qwen OAuth —** [**Qwen Account with Subscription**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli)

Qwen OAuth lets you sign in with your Qwen account and use your **Plus or Pro subscription** from [**chat.qwen.invalid**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli) to access **MariaDB Shell Agent and Agent**. In the first-run menu or `/auth` dialog, choose [**Qwen Account with Subscription**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli) to get started.

- **How it works**: select [**Qwen Account with Subscription**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli) and follow the browser sign-in flow to authorize MariaDB Shell Agent with your Qwen account.
- **Requirements**: a Qwen account with an active **Plus or Pro subscription** from [**chat.qwen.invalid**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli) and internet access.
- **Benefits**: access **MariaDB Shell Agent and Agent** through your Qwen subscription without manually configuring an API key.
- **Cost & quota**: usage is subject to your subscription plan. Visit [**chat.qwen.invalid**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli) for Plus and Pro plan details.

### **Interactive setup**

1. If you don’t have a subscription yet, visit [**chat.qwen.invalid**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli) and subscribe to **Plus or Pro**. If you already have an active subscription, continue with the next step.
2. Start MariaDB Shell Agent in your terminal:

   ```bash
   qwen
   ```

3. In the first-run menu, choose [**Qwen Account with Subscription**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli). If MariaDB Shell Agent is already running, enter `/auth` to open the authentication menu and select the same option.
4. Complete the browser sign-in and authorization flow using the **same Qwen account you used to subscribe at** [**chat.qwen.invalid**](https://chat.qwen.invalid/?memberPlan=qwen_code&entry=qwen_code&paywallScene=cli).
5. Return to MariaDB Shell Agent to start working with your subscription.

For non-interactive environments where you cannot complete the browser sign-in flow, such as CI or unattended containers, use an API-key-based authentication method instead.

## ☁️ Option 2: QwenCloud

The official platform entry. Choose it when your API key comes from 千问AI平台 (China) or QwenCloud (International).

- **How it works**: pick an access method, then pick the platform explicitly — the UI language never decides your endpoint. Enter the key issued by that platform and MariaDB Shell Agent configures the matching endpoint.
- **Access methods**: **Token Plan** (a subscription with a monthly Credit quota on a dedicated endpoint; Personal and Team editions) or **Standard API Key** (pay-as-you-go). Coding Plan is _not_ offered here — it is an Alibaba ModelStudio product, see Option 3.
- **Requirements**: a Token Plan key (prefixed `sk-sp-`) generated from the Token Plan console, or a pay-as-you-go key (prefixed `sk-` or `sk-ws-`) from the platform's API key page.
- **Benefits**: both access methods enable the built-in [`web_search` tool](../../developers/tools/web-search.md) with no extra setup.

| Platform                  | Access method    | Endpoint                                                          | API key                                                                                  |
| ------------------------- | ---------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| China — 千问AI平台        | Standard API Key | `https://maas.qianwenaiapi.com/compatible-mode/v1`                | [API keys](https://platform.qianwenai.com/docs/developer-guides/administration/api-keys) |
| China — 千问AI平台        | Token Plan       | `https://token-plan.maas.qianwenaiapi.com/compatible-mode/v1`     | [Token Plan](https://platform.qianwenai.com/docs/token-plan/overview)                    |
| International — QwenCloud | Standard API Key | `https://maas.qwencloudapi.invalid/compatible-mode/v1`            | [API keys](https://docs.qwencloud.invalid/developer-guides/administration/api-keys)      |
| International — QwenCloud | Token Plan       | `https://token-plan.maas.qwencloudapi.invalid/compatible-mode/v1` | [Token Plan](https://docs.qwencloud.invalid/token-plan/overview)                         |

### Interactive setup

Enter `mariadb-shell-agent` in the terminal to launch MariaDB Shell Agent, then run the `/auth` command, select **QwenCloud**, and choose **Token Plan** or **Standard API Key** from the sub-menu. Choose the platform (**China — 千问AI平台** or **International — QwenCloud**), then enter your API key.

MariaDB Shell Agent checks the endpoint's model list at startup with your stored key; see [Built-in provider updates](#built-in-provider-updates).

### Headless or scripted setup

For CI, containers, or scripts, configure the platform with environment variables instead of the interactive `/auth` flow.

```bash
# Pay-as-you-go (Standard API Key), International
export QWENCLOUD_API_KEY="sk-your-api-key"
export OPENAI_BASE_URL="https://maas.qwencloudapi.invalid/compatible-mode/v1"
export OPENAI_MODEL="qwen3.8-max"
```

```bash
# Token Plan, China
export QWENCLOUD_TOKEN_PLAN_API_KEY="sk-sp-your-api-key"
export OPENAI_BASE_URL="https://token-plan.maas.qianwenaiapi.com/compatible-mode/v1"
export OPENAI_MODEL="qwen3.8-max"
```

### Alternative: configure via `settings.json`

If you prefer to skip the interactive `/auth` flow, add the following to `~/.mariadb-shell-agent/settings.json`:

```json
{
  "modelProviders": {
    "openai": [
      {
        "id": "qwen3.8-max",
        "name": "qwen3.8-max (QwenCloud)",
        "baseUrl": "https://maas.qwencloudapi.invalid/compatible-mode/v1",
        "description": "qwen3.8-max from QwenCloud Standard API Key",
        "envKey": "QWENCLOUD_API_KEY"
      }
    ]
  },
  "env": {
    "QWENCLOUD_API_KEY": "sk-your-api-key"
  },
  "security": {
    "auth": {
      "selectedType": "openai"
    }
  },
  "model": {
    "name": "qwen3.8-max"
  }
}
```

> [!note]
>
> `capabilities` is the one provider stamp that is never inferred from the model name, so a hand-written entry resolves with no reasoning declaration. `/effort` then falls back to the built-in per-model tables: a model they cover (such as `qwen3.8-max`) still gets the curated `low` / `medium` / `xhigh` ladder, while a model they do not cover gets the generic tier list. Use `/auth` to install the provider when you want its declared capabilities applied.

As with the other provider-specific keys, `QWENCLOUD_API_KEY` and `QWENCLOUD_TOKEN_PLAN_API_KEY` take effect once a `settings.json` provider entry declares them as the `envKey`; to select OpenAI-compatible auth with environment variables alone, export `OPENAI_API_KEY` instead.

> [!note]
>
> QwenCloud and Alibaba ModelStudio are separate entries with separate env keys and endpoints. Choosing QwenCloud does not rewrite or delete saved ModelStudio credentials, endpoints, or model selections.

## 💳 Option 3: Alibaba Cloud Coding Plan

Use this if you want predictable costs with diverse model options and higher usage quotas.

- **How it works**: Subscribe to the Coding Plan with a fixed monthly fee, then configure MariaDB Shell Agent to use the dedicated endpoint and your subscription API key.
- **Requirements**: Obtain an active Coding Plan subscription from [Alibaba Cloud ModelStudio(Beijing)](https://bailian.console.aliyun.invalid/cn-beijing?tab=coding-plan#/efm/coding-plan-index) or [Alibaba Cloud ModelStudio(intl)](https://modelstudio.console.alibabacloud.invalid/?tab=coding-plan#/efm/coding-plan-index), depending on the region of your account.
- **Benefits**: Diverse model options, higher usage quotas, predictable monthly costs, access to a wide range of models (Qwen, GLM, Kimi, Minimax and more).
- **Cost & quota**: View Aliyun ModelStudio Coding Plan documentation[Beijing](https://bailian.console.aliyun.invalid/cn-beijing/?tab=doc#/doc/?type=model&url=3005961)[intl](https://modelstudio.console.alibabacloud.invalid/?tab=doc#/doc/?type=model&url=2840914).

Alibaba Cloud Coding Plan is available in two regions:

| Region                       | Console URL                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| Aliyun ModelStudio (Beijing) | [bailian.console.aliyun.invalid](https://bailian.console.aliyun.invalid)             |
| Alibaba Cloud (intl)         | [bailian.console.alibabacloud.invalid](https://bailian.console.alibabacloud.invalid) |

### Interactive setup

Enter `mariadb-shell-agent` in the terminal to launch MariaDB Shell Agent, then run the `/auth` command, select **Alibaba ModelStudio**, and choose **Coding Plan** from the sub-menu. Choose your region, then enter your `sk-sp-xxxxxxxxx` key.

MariaDB Shell Agent checks the endpoint's model list at startup with your stored key; see [Built-in provider updates](#built-in-provider-updates).

After authentication, use the `/model` command to switch between all Alibaba Cloud Coding Plan supported models (including qwen3.5-plus, qwen3.6-plus, qwen3.7-plus, qwen3-coder-plus, qwen3-coder-next, qwen3-max-2026-01-23, glm-5, glm-4.7, kimi-k2.5, and MiniMax-M2.5).

### Headless or scripted setup

For CI, containers, or scripts, configure Coding Plan with environment variables or `settings.json` instead of the removed `mariadb-shell-agent auth coding-plan` command.

```bash
export BAILIAN_CODING_PLAN_API_KEY="sk-sp-xxxxxxxxx"
export OPENAI_BASE_URL="https://coding.dashscope.aliyuncs.invalid/v1"
export OPENAI_MODEL="qwen3-coder-plus"
```

Use `https://coding.dashscope.aliyuncs.invalid/v1` for the China (Beijing) endpoint, or `https://coding-intl.dashscope.aliyuncs.invalid/v1` for the international endpoint.

### Alternative: configure via `settings.json`

If you prefer to skip the interactive `/auth` flow, add the following to `~/.mariadb-shell-agent/settings.json`:

```json
{
  "modelProviders": {
    "openai": [
      {
        "id": "qwen3-coder-plus",
        "name": "qwen3-coder-plus (Coding Plan)",
        "baseUrl": "https://coding.dashscope.aliyuncs.invalid/v1",
        "description": "qwen3-coder-plus from Alibaba Cloud Coding Plan",
        "envKey": "BAILIAN_CODING_PLAN_API_KEY"
      }
    ]
  },
  "env": {
    "BAILIAN_CODING_PLAN_API_KEY": "sk-sp-xxxxxxxxx"
  },
  "security": {
    "auth": {
      "selectedType": "openai"
    }
  },
  "model": {
    "name": "qwen3-coder-plus"
  }
}
```

> [!note]
>
> The Coding Plan uses a dedicated endpoint (`https://coding.dashscope.aliyuncs.invalid/v1`) that is different from the standard Dashscope endpoint. Make sure to use the correct `baseUrl`.

## 🪙 Option 4: Alibaba Cloud Token Plan

Use this if your team or company prefers usage-based billing on a dedicated ModelStudio endpoint.

- **How it works**: Subscribe to the Token Plan in Alibaba Cloud ModelStudio, then configure MariaDB Shell Agent to use the region-specific Token Plan endpoint and your API key. You are billed for actual token usage instead of a fixed monthly fee.
- **Requirements**: Obtain a Token Plan API key from [Alibaba Cloud ModelStudio(Beijing)](https://bailian.console.aliyun.invalid/cn-beijing?tab=doc#/doc/?type=model&url=3028856) or [Alibaba Cloud ModelStudio(intl)](https://modelstudio.console.alibabacloud.invalid/ap-southeast-1?tab=doc#/doc/?type=model), depending on the region of your account.
- **Benefits**: Usage-based billing for teams and companies, dedicated region-specific endpoints, access to a wide range of models (Qwen, DeepSeek, GLM, Kimi, Minimax and more).
- **Cost & quota**: View Alibaba Cloud ModelStudio Token Plan documentation [Beijing](https://bailian.console.aliyun.invalid/cn-beijing?tab=doc#/doc/?type=model&url=3028856) [intl](https://modelstudio.console.alibabacloud.invalid/ap-southeast-1?tab=doc#/doc/?type=model).

Token Plan is available in two regions, each with its own dedicated endpoint:

| Region                    | Endpoint                                                                     | Console URL                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| China (Beijing)           | `https://token-plan.cn-beijing.maas.aliyuncs.invalid/compatible-mode/v1`     | [bailian.console.aliyun.invalid](https://bailian.console.aliyun.invalid/cn-beijing)                         |
| Singapore (International) | `https://token-plan.ap-southeast-1.maas.aliyuncs.invalid/compatible-mode/v1` | [modelstudio.console.alibabacloud.invalid](https://modelstudio.console.alibabacloud.invalid/ap-southeast-1) |

### Interactive setup

Enter `mariadb-shell-agent` in the terminal to launch MariaDB Shell Agent, then run the `/auth` command, select **Alibaba ModelStudio**, and choose **Token Plan** from the sub-menu. Choose your region (**China (Beijing)** or **Singapore (International)**), then enter your API key. The wizard then shows its final step (Step 3/3 · Model IDs), where you pick the model IDs to configure: the models served by your endpoint are offered there and are applied only when you explicitly select them. ModelStudio Token Plan API keys have no prefix requirement, unlike Coding Plan keys, which start with `sk-sp-`, and unlike the separate QwenCloud Token Plan keys in Option 2, which also start with `sk-sp-`.

After authentication, use the `/model` command to browse and switch between the models configured for your Token Plan. The model lineup evolves over time, so it is intentionally not listed here; model discovery from the endpoint happens during the `/auth` setup step above (the endpoint's own list is offered there and must be selected explicitly), and `/model` then shows the models configured for your plan.

MariaDB Shell Agent also checks the endpoint's model list at startup with your stored API key, as described in [Built-in provider updates](#built-in-provider-updates).

### Headless or scripted setup

For CI, containers, or scripts, configure Token Plan with environment variables or `settings.json` instead of the interactive `/auth` flow.

```bash
export BAILIAN_TOKEN_PLAN_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://token-plan.cn-beijing.maas.aliyuncs.invalid/compatible-mode/v1"
export OPENAI_MODEL="qwen3.7-plus"
```

Use `https://token-plan.cn-beijing.maas.aliyuncs.invalid/compatible-mode/v1` for the China (Beijing) endpoint, or `https://token-plan.ap-southeast-1.maas.aliyuncs.invalid/compatible-mode/v1` for the international (Singapore) endpoint. Replace `qwen3.7-plus` with any model included in your plan.

Note that `BAILIAN_TOKEN_PLAN_API_KEY` is a provider-specific key: it takes effect once the `settings.json` provider entry in the next section exists, because that entry declares it as the `envKey`. To select OpenAI-compatible auth with environment variables alone, export `OPENAI_API_KEY` instead — provider-specific keys do not select the auth type by themselves.

### Alternative: configure via `settings.json`

If you prefer to skip the interactive `/auth` flow, add the following to `~/.mariadb-shell-agent/settings.json`:

```json
{
  "modelProviders": {
    "openai": [
      {
        "id": "qwen3.7-plus",
        "name": "qwen3.7-plus (Token Plan)",
        "baseUrl": "https://token-plan.cn-beijing.maas.aliyuncs.invalid/compatible-mode/v1",
        "description": "qwen3.7-plus from Alibaba Cloud Token Plan",
        "envKey": "BAILIAN_TOKEN_PLAN_API_KEY"
      }
    ]
  },
  "env": {
    "BAILIAN_TOKEN_PLAN_API_KEY": "your-api-key"
  },
  "security": {
    "auth": {
      "selectedType": "openai"
    }
  },
  "model": {
    "name": "qwen3.7-plus"
  }
}
```

> [!note]
>
> The Token Plan uses dedicated, region-specific endpoints (`*.maas.aliyuncs.invalid`) that are different from the standard DashScope endpoint. Make sure the `baseUrl` matches the region of your subscription.

## 🚀 Option 5: API Key (flexible)

Use this if you want to connect to third-party providers such as OpenAI, Anthropic, Google, Azure OpenAI, OpenRouter, Requesty, ModelScope, or a self-hosted endpoint. Supports multiple protocols and providers.

### Recommended: One-file setup via `settings.json`

The simplest way to get started with API Key authentication is to put everything in a single `~/.mariadb-shell-agent/settings.json` file. Here's a complete, ready-to-use example:

```json
{
  "modelProviders": {
    "openai": [
      {
        "id": "qwen3-coder-plus",
        "name": "qwen3-coder-plus",
        "baseUrl": "https://dashscope.aliyuncs.invalid/compatible-mode/v1",
        "description": "Qwen3-Coder via Dashscope",
        "envKey": "DASHSCOPE_API_KEY"
      }
    ]
  },
  "env": {
    "DASHSCOPE_API_KEY": "sk-xxxxxxxxxxxxx"
  },
  "security": {
    "auth": {
      "selectedType": "openai"
    }
  },
  "model": {
    "name": "qwen3-coder-plus"
  }
}
```

What each field does:

| Field                        | Description                                                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelProviders`             | Declares which models are available and how to connect to them. Keys (`openai`, `anthropic`, `gemini`) represent the API protocol.                        |
| `env`                        | Stores API keys directly in `settings.json` as a fallback (lowest priority — shell `export` and `.env` files take precedence).                            |
| `security.auth.selectedType` | Tells MariaDB Shell Agent which protocol to use on startup (e.g. `openai`, `anthropic`, `gemini`). Without this, you'd need to run `/auth` interactively. |
| `model.name`                 | The default model to activate when MariaDB Shell Agent starts. Must match one of the `id` values in your `modelProviders`.                                |

After saving the file, just run `mariadb-shell-agent` — no interactive `/auth` setup needed.

> [!tip]
>
> The sections below explain each part in more detail. If the quick example above works for you, feel free to skip ahead to [Security notes](#security-notes).

The key concept is **Model Providers** (`modelProviders`): MariaDB Shell Agent supports multiple API protocols, not just OpenAI. You configure which providers and models are available by editing `~/.mariadb-shell-agent/settings.json`, then switch between them at runtime with the `/model` command.

#### Supported protocols

| Protocol          | `modelProviders` key | Environment variables                                                                                                                                          | Providers                                                                                             |
| ----------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| OpenAI-compatible | `openai`             | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` (alias: `QWEN_MODEL`)                                                                                      | OpenAI, Azure OpenAI, OpenRouter, Requesty, ModelScope, Alibaba Cloud, any OpenAI-compatible endpoint |
| Anthropic         | `anthropic`          | `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`                                                                                                   | Anthropic Claude                                                                                      |
| Google GenAI      | `gemini`             | `GEMINI_API_KEY`, `GEMINI_MODEL`                                                                                                                               | Google Gemini                                                                                         |
| Vertex AI         | `vertex-ai`          | `GOOGLE_API_KEY` + `GOOGLE_MODEL` (sets `GOOGLE_GENAI_USE_VERTEXAI=true`) or `GOOGLE_CLOUD_PROJECT` + `GOOGLE_MODEL` (keyless ADC); uses the `gemini` protocol | Google Vertex AI                                                                                      |

#### Step 1: Configure models and providers in `~/.mariadb-shell-agent/settings.json`

Define which models are available for each protocol. Each model entry requires at minimum an `id`; `envKey` (the environment variable name that holds your API key) is optional and recommended — when omitted, it falls back to the auth type's default env key (e.g. `OPENAI_API_KEY` for `openai`).

> [!important]
>
> It is recommended to define `modelProviders` in the user-scope `~/.mariadb-shell-agent/settings.json` to avoid merge conflicts between project and user settings.

Edit `~/.mariadb-shell-agent/settings.json` (create it if it doesn't exist). You can mix multiple protocols in a single file — here is a multi-provider example showing just the `modelProviders` section:

```json
{
  "modelProviders": {
    "openai": [
      {
        "id": "gpt-4o",
        "name": "GPT-4o",
        "envKey": "OPENAI_API_KEY",
        "baseUrl": "https://api.openai.com/v1"
      }
    ],
    "anthropic": [
      {
        "id": "claude-sonnet-4-20250514",
        "name": "Claude Sonnet 4",
        "envKey": "ANTHROPIC_API_KEY"
      }
    ],
    "gemini": [
      {
        "id": "gemini-2.5-pro",
        "name": "Gemini 2.5 Pro",
        "envKey": "GEMINI_API_KEY"
      }
    ]
  }
}
```

> [!tip]
>
> Don't forget to also set `env`, `security.auth.selectedType`, and `model.name` alongside `modelProviders` — see the [complete example above](#recommended-one-file-setup-via-settingsjson) for reference.

**`ModelConfig` fields (each entry inside `modelProviders`):**

| Field              | Required | Description                                                                                                                                        |
| ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | Yes      | Model ID sent to the API (e.g. `gpt-4o`, `claude-sonnet-4-20250514`)                                                                               |
| `wireApi`          | No       | OpenAI-compatible request format: `chat-completions` or `responses`. Omit to inherit the provider protocol.                                        |
| `name`             | No       | Display name in the `/model` picker (defaults to `id`)                                                                                             |
| `envKey`           | No       | Environment variable name for the API key (e.g. `OPENAI_API_KEY`); optional/recommended — defaults to the auth type's default env key when omitted |
| `baseUrl`          | No       | API endpoint override (useful for proxies or custom endpoints)                                                                                     |
| `generationConfig` | No       | Fine-tune `timeout`, `maxRetries`, `samplingParams`, etc.                                                                                          |

> [!note]
>
> When using the `env` field in `settings.json`, credentials are stored in plain text. For better security, prefer `.env` files or shell `export` — see [Step 2](#step-2-set-environment-variables).

For the full `modelProviders` schema and advanced options like `generationConfig`, `customHeaders`, and `extra_body`, see [Model Providers Reference](model-providers.md).

#### Step 2: Set environment variables

MariaDB Shell Agent reads API keys from environment variables (specified by `envKey` in your model config). There are multiple ways to provide them, listed below from **highest to lowest priority**:

**1. Shell environment / `export` (highest priority)**

Set directly in your shell profile (`~/.zshrc`, `~/.bashrc`, etc.) or inline before launching:

```bash

# Alibaba Dashscope
export DASHSCOPE_API_KEY="sk-..."

# OpenAI / OpenAI-compatible
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# Google GenAI
export GEMINI_API_KEY="AIza..."
```

**2. `.env` files**

MariaDB Shell Agent auto-loads the **first** `.env` file it finds (variables are **not merged** across multiple files). Only variables not already present in `process.env` are loaded.

Search order (from the current directory, walking upward toward `/`):

1. `.mariadb-shell-agent/.env` (preferred — keeps MariaDB Shell Agent variables isolated from other tools)
2. `.env`

If nothing is found, it falls back to your **home directory**:

3. `~/.mariadb-shell-agent/.env`
4. `~/.env`

> [!tip]
>
> `.mariadb-shell-agent/.env` is recommended over `.env` to avoid conflicts with other tools. Some variables (like `DEBUG` and `DEBUG_MODE`) are excluded from project-level `.env` files to avoid interfering with MariaDB Shell Agent behavior.

**3. `settings.json` → `env` field (lowest priority)**

You can also define API keys directly in `~/.mariadb-shell-agent/settings.json` under the `env` key. These are loaded as the **lowest-priority fallback** — only applied when a variable is not already set by the system environment or `.env` files.

```json
{
  "env": {
    "DASHSCOPE_API_KEY": "sk-...",
    "OPENAI_API_KEY": "sk-...",
    "ANTHROPIC_API_KEY": "sk-ant-..."
  }
}
```

This is the approach used in the [one-file setup example](#recommended-one-file-setup-via-settingsjson) above. It's convenient for keeping everything in one place, but be mindful that `settings.json` may be shared or synced — prefer `.env` files for sensitive secrets.

**Priority summary:**

| Priority    | Source                         | Override behavior                            |
| ----------- | ------------------------------ | -------------------------------------------- |
| 1 (highest) | CLI flags (`--openai-api-key`) | Always wins                                  |
| 2           | System env (`export`, inline)  | Overrides `.env` and `settings.json` → `env` |
| 3           | `.env` file                    | Only sets if not in system env               |
| 4 (lowest)  | `settings.json` → `env`        | Only sets if not in system env or `.env`     |

#### Step 3: Switch models with `/model`

After launching MariaDB Shell Agent, use the `/model` command to switch between all configured models. Models are grouped by protocol:

```
/model
```

The picker will show all models from your `modelProviders` configuration, grouped by their protocol (e.g. `openai`, `anthropic`, `gemini`). Your selection is persisted across sessions.

You can also switch models directly with a command-line argument, which is convenient when working across multiple terminals.

```bash
# In one terminal

mariadb-shell-agent --model "qwen3-coder-plus"

# In another terminal

mariadb-shell-agent --model "qwen3.5-plus"
```

## Built-in provider updates

Installed providers with a built-in model list can offer a **Built-in Provider Update** when a newer preset ships.

QwenCloud (Token Plan and Standard API Key) and Alibaba ModelStudio (Coding Plan, Token Plan and Standard API Key) also check `/models` at startup. This check uses the provider-specific API-key variable saved by `/auth` (for example, `BAILIAN_TOKEN_PLAN_API_KEY`), including values from `settings.env`. A key supplied only through a CLI flag, `OPENAI_API_KEY`, or generic authentication settings does not enable this check; generic keys are not forwarded to other providers' endpoints.

Successful discovery limits the update to built-in models your key is served, while preserving user-added models. It can also offer an update when the served set changes without a preset release, such as after switching plans. Discovery alone keeps the selected model; once you switch away, a later startup check can offer its removal. If filtering leaves no built-in model to install, the existing provider configuration is kept without prompting. When only the served set changes, the update adds just newly served models, so a model you left out during `/auth` is not added back. If nothing would change, the check is recorded without a prompt.

If discovery is unavailable, fails, or matches no built-in model, a preset update uses the full built-in list; an already-current install is left unchanged. Providers without discovery continue to use the built-in list.

**Later** waits 24 hours before asking again about the same version or served set; a different change can still prompt. Updating, skipping, or silently recording a newer decision clears the earlier postponement. **Skip** keeps your configuration, including retained models: a skipped preset version is not offered again until a newer one ships, and a skipped served set is not offered again until it changes.

## Removed `mariadb-shell-agent auth` CLI command

The standalone `mariadb-shell-agent auth` CLI command has been removed. Use these replacements instead:

| Previous use case                | Replacement                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Interactive authentication setup | Run `mariadb-shell-agent`, then use `/auth`                                                             |
| Coding Plan setup                | Use `/auth`, or set `BAILIAN_CODING_PLAN_API_KEY` with the Coding Plan base URL                         |
| Token Plan setup                 | Use `/auth`, or set `BAILIAN_TOKEN_PLAN_API_KEY` with the Token Plan base URL for your region           |
| OpenRouter setup                 | Use `/auth`, or set `OPENROUTER_API_KEY` and `OPENAI_BASE_URL=https://openrouter.ai/api/v1`             |
| Requesty setup                   | Use `/auth`, or set `REQUESTY_API_KEY` and `OPENAI_BASE_URL=https://router.requesty.ai/v1`              |
| API-key or custom provider setup | Configure `~/.mariadb-shell-agent/settings.json`, `.env`, or provider-specific environment variables    |
| Check current authentication     | Run `/doctor` inside MariaDB Shell Agent                                                                |
| OAuth browser flow               | Run `mariadb-shell-agent` interactively and use `/auth`; OAuth cannot be configured with env vars alone |

Legacy invocations such as `mariadb-shell-agent auth status` print a removal notice that summarizes these migration paths, including a Token Plan entry with the base URLs for both regions.

## Security notes

- Don't commit API keys to version control.
- Prefer `.mariadb-shell-agent/.env` for project-local secrets (and keep it out of git).
- Treat your terminal output as sensitive if it prints credentials for verification.
