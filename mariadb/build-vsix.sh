#!/bin/bash
# Builds the MariaDB Shell Agent VS Code extension into mariadb/dist/.
#
#   mariadb/build-vsix.sh            # for this machine (e.g. darwin-arm64), with node-pty
#   mariadb/build-vsix.sh universal  # any platform, without node-pty (MariaDB Cloud Workbench on the Pi)
#
# node-pty is a native module and is only installed for the platform the build runs on, so
# other platform-specific targets are not offered; use the universal build for them.
set -euo pipefail
cd "$(dirname "$0")/.."

case "${1:-host}" in
  host)
    TARGET="$(node -p "({darwin:'darwin',linux:'linux',win32:'win32'})[process.platform]")-$(node -p process.arch)"
    export VSCODE_TARGET=$TARGET UNIVERSAL_BUILD=false
    TARGET_ARGS=(--target "$TARGET")
    ;;
  universal)
    TARGET=universal
    export UNIVERSAL_BUILD=true
    unset VSCODE_TARGET
    TARGET_ARGS=()
    ;;
  *) echo "usage: $0 [universal]" >&2; exit 1 ;;
esac

grep -q '"publisher": "MariaDB"' packages/vscode-ide-companion/package.json ||
  { echo "branding not applied; run node mariadb/rebrand.mjs" >&2; exit 1; }

# The packages carry the fork's version (mariadb/VERSION); the sources keep upstream's. The CLI
# bundle and its package.json take it from MARIADB_FORK_VERSION (rebrand/version.mjs), the
# extension manifest is set to it for the build and restored afterwards.
VERSION=$(tr -d '[:space:]' < mariadb/VERSION)
export MARIADB_FORK_VERSION=$VERSION
MANIFEST=packages/vscode-ide-companion/package.json
MANIFEST_BACKUP=$(mktemp)
cp "$MANIFEST" "$MANIFEST_BACKUP"
trap 'cp "$MANIFEST_BACKUP" "$MANIFEST"; rm -f "$MANIFEST_BACKUP"' EXIT
node -e '
  const fs = require("fs");
  const [file, version] = process.argv.slice(1);
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  pkg.version = version;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
' "$MANIFEST" "$VERSION"

OUT="$PWD/mariadb/dist/mariadb-shell-agent-$VERSION-$TARGET.vsix"
mkdir -p mariadb/dist

# esbuild never empties dist/: chunks of earlier builds would end up in the package.
rm -rf packages/vscode-ide-companion/dist

# The extension's prepackage step bundles the CLI and Web Shell into dist/ first.
npm --workspace=mariadb-shell-agent run package -- ${TARGET_ARGS[@]+"${TARGET_ARGS[@]}"} --out "$OUT"
node mariadb/check-leaks.mjs "$OUT"
echo "built $OUT"
