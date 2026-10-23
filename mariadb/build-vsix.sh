#!/bin/bash
# Builds the MariaDB Code VS Code extension into mariadb/dist/.
#
#   mariadb/build-vsix.sh            # for this machine (e.g. darwin-arm64), with node-pty
#   mariadb/build-vsix.sh universal  # any platform, without node-pty (MariaDB Cloud IDE on the Pi)
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

VERSION=$(node -p "require('./packages/vscode-ide-companion/package.json').version")
OUT="$PWD/mariadb/dist/mariadb-code-$VERSION-$TARGET.vsix"
mkdir -p mariadb/dist

# The extension's prepackage step bundles the CLI and Web Shell into dist/ first.
npm --workspace=mariadb-code run package -- ${TARGET_ARGS[@]+"${TARGET_ARGS[@]}"} --out "$OUT"
echo "built $OUT"
