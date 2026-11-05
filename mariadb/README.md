# MariaDB Shell Agent

MariaDB Shell Agent (formerly MariaDB Code) is a fork of [Qwen Code](https://github.com/QwenLM/qwen-code) with MariaDB branding,
including the VS Code extension (used in local VS Code and in `../mariadb-workbench`). It follows
upstream closely: the fork syncs with upstream as soon as upstream moves.

## What differs from upstream

| Area                                | MariaDB Shell Agent                                                            | Upstream                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Name, icons, banner, Web Shell logo | MariaDB Shell Agent, MariaDB seal                                              | Qwen Code                                                                                                              |
| CLI command                         | `mariadb-shell-agent`, short `msa`                                             | `qwen`                                                                                                                 |
| Config directory                    | `~/.mariadb-shell-agent`, `<project>/.mariadb-shell-agent`                     | `.qwen`                                                                                                                |
| Project instructions                | `MARIADB-SHELL-AGENT.md` (`AGENTS.md` is read too)                             | `QWEN.md`                                                                                                              |
| Ignore file                         | `.mariadb-shell-agentignore`                                                   | `.qwenignore`                                                                                                          |
| Environment                         | `MARIADB_SHELL_AGENT_<X>` overrides `QWEN_<X>` / `QWEN_CODE_<X>`               | `QWEN_*` only                                                                                                          |
| VS Code extension                   | `MariaDB.mariadb-shell-agent`, commands and settings `mariadb-shell-agent.*`   | `qwenlm.qwen-code-vscode-ide-companion`, `qwen-code.*`                                                                 |
| Model providers offered             | OpenRouter, Requesty, OpenAI, Grok, custom (CLI, Web Shell, VS Code extension) | DeepSeek, MiniMax, Z.AI, Kimi, QwenCloud, Alibaba ModelStudio, Idealab, ModelScope, OpenRouter, Requesty, Grok, custom |
| Alibaba endpoints                   | none: every Alibaba and QwenLM host is made unresolvable (`.invalid`)          | self-update, telemetry, Qwen OAuth, …                                                                                  |
| Usage statistics, self-update       | off by default, and nowhere to send to or download from                        | on                                                                                                                     |
| Channels                            | upstream's, without QQ Bot (its connector is `UNLICENSED`)                     | Telegram, WeChat, DingTalk, WeCom, Feishu, QQ Bot, Email, GitHub, GitLab                                               |

Not renamed: the `QWEN_*` variable names themselves (169 of them; use the `MARIADB_SHELL_AGENT_*`
aliases), internal file names inside the config directory, `qwen-extension.json` (the extension
manifest format), and Qwen model names.

The Alibaba presets stay registered internally (reasoning overrides and the extension's plan
definitions look them up), but no picker or provider list offers them and their hosts do not
resolve.

Not touched, because they are identifiers rather than endpoints: the JSON-schema `$id`s of the
managed-runtime contracts and the Kubernetes CSI driver name `diskplugin.csi.alibabacloud.com`
(see `mariadb/leak-allowlist.json`).

Features that only worked against Alibaba or QwenLM services are gone with their hosts: the
standalone self-updater and installers, the Live host and managed-runtime downloads, Qwen OAuth,
the OSS artifact publisher, and the QwenLM sandbox image (`config.sandboxImageUri`; a sandbox
needs an image of our own).

## How the fork follows upstream

Upstream files are never edited by hand. Everything the fork changes comes from `mariadb/` (and
`.claude/`, our session notes): rules and patches that `mariadb/rebrand.mjs` applies to upstream's
files. The rest of the tree is generated, and `mariadb/UPSTREAM` records the upstream commit it is
generated from. `main` is never rewritten:

```
main:      ── S1 ── c ── c ── R ── S2 ──      S = sync (merge commit), c = change to mariadb/,
             /                     /             R = regenerated branding
upstream: ─ U1 ─────────────────── U2
```

- A sync is a merge commit whose parents are the branch and the new upstream commit, and whose
  tree is what the rules generate from that upstream commit. It is computed, not merged, so it
  never conflicts, and main keeps upstream's history (`git log --first-parent` shows only ours).
- A change to `mariadb/` is followed by a commit that regenerates the branding with the same
  upstream commit, so a pull request shows the rule change and its effect on the code.
- `mariadb/rebrand.mjs` runs the rules in `mariadb/rebrand/`, one module per topic (identity,
  version, product name, name length, alibaba, channels, paths, cli-name, extension-ids, review,
  skipped-tests, github, vscode-settings, notices, copyright). Each rule fails loudly when upstream moves its anchor.
- `mariadb/rebrand/github.mjs` removes upstream's GitHub workflows, Dependabot config and code
  owners (they belong to QwenLM's repository) and installs ours from `mariadb/github/`.
- `mariadb/rebrand/channels.mjs` drops the QQ Bot channel from the CLI bundle: its connector,
  `@tencent-connect/qqbot-connector`, declares `UNLICENSED` and ships no license text, so we cannot
  distribute it. The workspace package `packages/channels/qqbot` stays, unbundled.
- `mariadb/rebrand/copyright.mjs` runs last. It adds `Copyright (c) 2026, MariaDB plc.` to the
  shipped LICENSE files and to the header of every source file the run changed, below upstream's
  copyright lines (Apache-2.0 §4(b): modified files say so). Files we wrote (added by a patch or
  generated by a rule) carry our notice alone. Markdown, JSON and assets have no header and stay as
  they are.
- `mariadb/rebrand/skipped-tests.mjs` lists the upstream tests of behaviour we removed (update
  checks, usage statistics defaults, Alibaba providers in pickers, QwenLM endpoints, upstream's
  workflows), each group with its reason. A test that fails because a rule renamed something
  inconsistently is a rule bug, not an entry there.
- `mariadb/check-leaks.mjs` scans the branded source (and with paths, build output such as a
  `.vsix`) for old names and Alibaba hosts. Known, intended exceptions are listed with a reason
  in `mariadb/leak-allowlist.json`.
- `mariadb/verify.mjs` runs the unit tests of the touched packages, reruns failing files in
  isolation and then against the pristine upstream sources (`mariadb/UPSTREAM`), and reports only
  the failures the branding causes.

## Code changes of our own

Changes to upstream behaviour that text rules can't express live as patch files in
`mariadb/patches/` (each starts with a short explanation). They are written against the pristine
upstream files and applied first, before the branding rules. When one no longer applies, the sync
stops: redo the change on the new upstream code (`git diff` of the edited files, then the
explanation on top) and commit the new patch.

- `0001-stable-context-file-paths.patch`: `~/…` paths in the system prompt's context-file markers
- `0002-mode-neutral-prompt-opening.patch`: one system prompt opening for headless, interactive and
  ACP mode (prompt caching across modes)
- `0003-daemon-bridge-for-browser-ides.patch`: in browser-based IDEs (Theia, code-server) the webview
  reaches the daemon through the extension host instead of the browser's own loopback
- `0004-mode-reminder-in-prelude.patch`: the main session's interaction-mode reminder moves from the
  system prompt into the startup prelude, so the system prompt is identical in every mode
- `0005-append-revealed-tools.patch`: tools revealed via `tool_search` are appended to the tools block
  instead of sorted into it
- `0006-idle-memory-extraction.patch`: memory extraction and dream wait for an idle session (10 s,
  `MARIADB_SHELL_AGENT_MEMORY_EXTRACT_IDLE_MS`) instead of running in parallel with the next question
- `0007-replay-sent-user-content.patch`: the transcript also records each prompt as it was sent
  (with the date, plan-mode, output-style and memory-recall reminders and the IDE context), and
  `--continue`/resume replays it unchanged, so a resumed session keeps the prompt cache
- `0009-calm-composer.patch`: no aura or glow around the focused composer and on the send button;
  the send button shows the execute bolt of the MariaDB VS Code extension instead of an arrow
- `0010-no-open-button-in-editor-toolbars.patch`: no "MariaDB Shell Agent: Open" button in editor title bars
- `0011-claude-plugin-mcp-and-lsp-files.patch`: Claude plugins whose plugin.json names an `.mcp.json`
  get its servers (were nested under one server called `mcpServers`), and a root `.lsp.json` is used
  when plugin.json declares no LSP servers
- `0012-extension-setting-experimental-lsp.patch`: extension setting `mariadb-shell-agent.experimentalLsp`
  (off by default) starts the daemon and ACP process with `--experimental-lsp`
- `0013-lsp-servers-of-extensions-at-startup.patch`: LSP servers declared by extensions are found at
  startup (discovery ran before extensions were loaded)
- `0014-lsp-extension-configs-keyed-by-server.patch`: an extension's `.lsp.json` with
  `extensionToLanguage` is keyed by server name, as in Claude plugins (`/lsp` showed the command as the
  server and the server name as its language)
- `0015-no-installation-greeting.patch`: no "Companion extension successfully installed." notification
  on the extension's first activation
- `0016-provider-setup-wizard.patch`: the extension no longer starts the provider setup on its own;
  Get Started (or `/auth`) opens it as a wizard inside the view instead of VS Code QuickPicks and
  InputBoxes, offering OpenRouter, Requesty, OpenAI API Key, Grok and Custom; adds the OpenAI API Key
  preset (id `openai`, `OPENAI_API_KEY`, OpenAI Responses API, default model `gpt-6.1-sol`) to core;
  the welcome title gets the Web Shell's size and gradient, and every wizard page starts with the
  product name in that gradient, subtitled "Provider Setup Wizard". The CLI and Web Shell offer the same five
  providers (`OFFERED_PROVIDER_IDS` in `rebrand/alibaba.mjs`)
- `0017-gpt-6-model-limits.patch`: reasoning controls for `gpt-6.1-sol`, `gpt-6.1-terra` and
  `gpt-6-luna` (next to upstream's `gpt-6-astra`), and the GPT-6 token limits (922K input, 128K
  output) instead of the generic GPT fallback

These are good candidates for upstream pull requests, which would retire the patches.

## Remotes

| Remote     | URL                                                          | Use                        |
| ---------- | ------------------------------------------------------------ | -------------------------- |
| `origin`   | `https://github.com/mariadb-corporation/mariadb-shell-agent` | our fork; `main` tracks it |
| `upstream` | `https://github.com/QwenLM/qwen-code`                        | fetch only (push disabled) |

## Changing the fork

On a branch: commit the change to `mariadb/`, then regenerate the branding and open a pull request.

```sh
git switch -c <topic> main
# edit mariadb/ (a rule, a patch, an asset), then
git commit -- mariadb/
mariadb/sync-upstream.sh --regenerate             # commits "Regenerate the branding", installs, leak scan
mariadb/sync-upstream.sh --regenerate --verify    # ... plus the test gate (~1 h)
```

Files outside `mariadb/` and `.claude/` are regenerated from scratch, so edits to them by hand are
lost; CI fails a pull request whose generated files differ from what the rules produce.

## Sync with upstream

```sh
mariadb/sync-upstream.sh                 # on main: creates sync/upstream-<sha>, merges, regenerates, installs, leak scan
mariadb/sync-upstream.sh --verify --pr   # ... plus the test gate (~1 h), then push and open the pull request
mariadb/sync-upstream.sh --to <rev>      # an older upstream commit (upstream main broken)
```

Merge the sync pull request with **Create a merge commit**. Squash or rebase would drop the
upstream parent; CI on main fails when `mariadb/UPSTREAM` is no longer in main's history. If main
moved after the sync branch was made, run the sync again on the branch rather than using "Update
branch", so the tree stays exactly what the rules generate.

If a rule stops with "anchor not found", upstream changed that spot. The script returns to the
sync branch; adapt the rule in `mariadb/rebrand/` (or redo the patch), commit it on the sync branch
and run the sync again there. The same applies when the leak scan finds a new occurrence: extend a
rule, or allowlist it with a reason.

## GitHub Actions

Our workflows live in `mariadb/github/` and are installed into `.github/` by the rebrand:

- `ci.yml`: on pull requests, the branding check (`sync-upstream.sh --check`), the leak scan and
  the unit test gate (`verify.mjs`, one job per package or shard); on main, the branding check
  and leak scan (which also catch a squashed sync).
- `build.yml`: the universal VS Code extension, as a workflow artifact on pull requests and manual
  runs; a tag `v<mariadb/VERSION>`, which only repository admins can push, also publishes it as
  a GitHub Release. A release therefore always starts by hand (environment reviewers are not
  available on a private repository with our GitHub plan). Once the repository is public, add a
  `release-build` environment with the devtools team as required reviewer and `v*` as its only
  tag, and give the `release` job `environment: 'release-build'`, as the shell's release does.
- `CODEOWNERS`: the devtools team reviews every pull request; the branch protection on main
  only lets its members merge one.
- `actions/pnpm-install`: Node.js 22 and `pnpm install --frozen-lockfile` for every job, with
  pnpm's store cached by the lockfile's hash (caches saved on main are shared with pull requests).
  `build: 'false'` skips the monorepo build the install otherwise runs (the branding job).

`[bypass-ci]` in a pull request's title or newest commit message skips both (the jobs report as
skipped, which counts as passed for required checks). It only works for branches of this
repository, not for pull requests from forks.

Branch protection on main requires the checks `Branding and leak scan` and `Tests`. `Tests` is a
summary job that passes when every test shard passed or `[bypass-ci]` skipped them; a skipped
matrix job reports under its unexpanded name, so requiring the shards themselves would leave a
`[bypass-ci]` pull request waiting forever. Changing the shards needs no protection change.

## Build the VS Code extension

Releases are built by GitHub Actions: bump `mariadb/VERSION` in a pull request, then tag the
merged commit. Only repository admins can push a `v*` tag, and pushing it is what publishes
the release.

```sh
git tag v$(cat mariadb/VERSION) && git push origin v$(cat mariadb/VERSION)   # GitHub Release with the universal .vsix
```

Locally:

```sh
corepack pnpm install --frozen-lockfile
mariadb/build-vsix.sh universal   # any platform, no node-pty: the build we ship (MariaDB Cloud Workbench, Pi)
mariadb/build-vsix.sh             # this machine only, with node-pty, e.g. mariadb-shell-agent-<v>-darwin-arm64.vsix
code --install-extension mariadb/dist/mariadb-shell-agent-<v>-universal.vsix
```

The packages carry the fork's own version from `mariadb/VERSION` (`<v>` above; year.month.n,
e.g. 26.10.1), set only for the build: the extension manifest during packaging, the bundled CLI
through `MARIADB_FORK_VERSION` (`mariadb/rebrand/version.mjs`). The sources, the workspace and the
tests keep upstream's version; the upstream base is recorded in `mariadb/UPSTREAM`. Bump
`mariadb/VERSION` for each build you hand out.

Each build is leak-scanned after packaging. The universal build leaves out the optional native
modules (node-pty, audio capture): shell commands run without a terminal, and voice input is
unavailable. In `../mariadb-workbench`: `npm run plugin:mariadb-shell-agent` unpacks the newest
universal build into `plugins/`, then `npm run deploy:pi`.

## Third-party notices and contribution guide

`THIRD-PARTY-NOTICES.txt` at the repository root lists the npm packages the extension ships
with their license texts, grouped by distinct text as in the MariaDB Shell Workbench. The same
file goes into the extension as `NOTICES.txt` (next to `LICENSE.txt` in the `.vsix`; the
Workbench's own notices find it by that name), and both LICENSE files point to it.

The source of the file is `mariadb/THIRD-PARTY-NOTICES.txt`, written by
`node mariadb/generate-notices.mjs` from the installed dependencies of the extension _and_ of
the CLI it bundles (`packages/cli`; upstream's generator walks the extension's dependencies only
and so misses some 180 packages of the CLI bundle). The rebrand copies it into place
(`mariadb/rebrand/notices.mjs`) and points the extension's `generate:notices` script, which
upstream's packaging runs, at `generate-notices.mjs --check`, so a stale file fails the build
instead of being overwritten with the shorter list. The same `--check` runs in CI and after the
install in `sync-upstream.sh`: when a sync changes dependencies, the script regenerates the
file and stops; commit it on the sync branch and run `--regenerate`.

The license lookup is upstream's (`packages/vscode-ide-companion/scripts/generate-notices.js`:
license and NOTICE files, a package's `licenses/` directory, the MIT fallback, ExcelJS's browser
bundle). A package that ships no license file gets its project's text from
`mariadb/licenses/npm/<name>@<version>` (`/` in a scoped name written as `+`) when we added
one; the rest are listed at the end with the license they declare (none at the moment).

`CONTRIBUTING.md` is ours too (`mariadb/CONTRIBUTING.md`, installed by `rebrand/identity.mjs`):
MariaDB's contribution page and the Jira project MSH replace upstream's process.

## Icons

`mariadb/assets/` holds the artwork:

- `activityBar-agent.svg`: the activity-bar icon (monochrome; VS Code and Theia tint it to the theme).
- `app-icon.svg` and its PNG renders: the extension and Web Shell icon. The Web Shell favicon is the
  SVG, its sidebar mark `icon-192.png` (as a data URI: the artwork is too rich to inline as JSX).
- `seal-mono.svg`: the monochrome seal: the Web Shell welcome seal (in the text color) and the
  favicon of exported HTML transcripts. It must be plain shapes (no gradients, images or links).

SVGs can be committed as a design tool or an optimizer exports them: the artwork rule drops the XML
prolog, editor ids and namespaces, turns presentation styles into attributes and keeps presentation
attributes of the root (`svgParts` in `rebrand/artwork.mjs`).
