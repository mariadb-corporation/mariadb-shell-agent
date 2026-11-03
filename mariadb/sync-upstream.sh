#!/bin/bash
# Copyright (c) 2026, MariaDB plc.
# SPDX-License-Identifier: Apache-2.0
#
# Regenerates the branded tree and commits it. main is never rewritten (see mariadb/README.md).
#
#   mariadb/sync-upstream.sh [--to <upstream rev>] [--verify] [--pr]   # move to a new upstream commit
#   mariadb/sync-upstream.sh --regenerate [--verify]                   # same upstream, after a mariadb/ change
#   mariadb/sync-upstream.sh --check                                   # CI: is HEAD what the rebrand generates?
#
# The branded tree is computed, never merged: upstream's files at the upstream commit plus this
# branch's mariadb/ and .claude/, run through mariadb/rebrand.mjs and formatted like the commit
# hook does (prettier, eslint --fix). Files outside mariadb/ and .claude/ are always regenerated,
# so edits to them by hand are lost (and --check fails on them). mariadb/UPSTREAM records the
# upstream commit.
#
# A sync runs on a branch sync/upstream-<sha> (created from main when started on main) and
# commits the tree as a merge of the branch and the upstream commit, so main keeps upstream's
# history and only ever moves forward: the sync PR is merged with a merge commit, never squashed.
# When a rule no longer finds its anchor, the run stops and returns to the branch: fix the rule,
# commit it on the sync branch and run again. --to picks an older upstream commit than
# upstream/main, e.g. while upstream's main does not build.
#
# --regenerate commits the tree on the current branch on top of a mariadb/ change, with the same
# upstream commit. Both then install dependencies and run the leak scan (mariadb/check-leaks.mjs);
# --verify adds the test gate (mariadb/verify.mjs, about an hour), and --pr pushes the sync
# branch to origin and opens its pull request, only when those checks passed.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE=sync
PR=false
VERIFY=false
TARGET=upstream/main
usage="usage: $0 [--to <upstream rev>] [--verify] [--pr] | --regenerate [--verify] | --check"
while [ $# -gt 0 ]; do
  case "$1" in
    --to) TARGET=$2; shift ;;
    --regenerate) MODE=regenerate ;;
    --check) MODE=check ;;
    --verify) VERIFY=true ;;
    --pr) PR=true ;;
    *) echo "$usage" >&2; exit 1 ;;
  esac
  shift
done
[ "$MODE" = sync ] || [ "$TARGET" = upstream/main ] || { echo "$usage" >&2; exit 1; }
$PR && [ "$MODE" != sync ] && { echo "$usage" >&2; exit 1; }

[ -z "$(git status --porcelain)" ] || { echo "working tree not clean; commit or stash first" >&2; exit 1; }

BRANCH=$(git branch --show-current)
if [ "$MODE" = sync ]; then
  git fetch -q upstream
  BASE=$(git rev-parse --verify "$TARGET^{commit}")
  if [ "$BRANCH" = main ]; then
    BRANCH="sync/upstream-$(git rev-parse --short "$BASE")"
    git checkout -q -b "$BRANCH"
  fi
else
  BASE=$(git rev-parse --verify "$(tr -d '[:space:]' < mariadb/UPSTREAM)^{commit}")
fi
ORIG=$(git rev-parse HEAD)
SHORT=$(git rev-parse --short "$BASE")

# Back to where the run started unless a commit was made (also on errors and Ctrl-C).
DONE=false
restore() {
  $DONE && return
  git checkout -q -f "${BRANCH:-$ORIG}"
  git clean -fdq
}
trap restore EXIT

# The pristine tree: upstream's files plus this branch's mariadb/ and .claude/.
INDEX="$(mktemp -d)/index"
PRISTINE_TREE=$(
  export GIT_INDEX_FILE=$INDEX
  git read-tree "$BASE"
  git rm -r -q -f --cached --ignore-unmatch -- mariadb .claude
  for dir in mariadb .claude; do
    if git cat-file -e "$ORIG:$dir" 2>/dev/null; then
      git read-tree --prefix="$dir/" "$ORIG:$dir"
    fi
  done
  git update-index --add --cacheinfo \
    "100644,$(git rev-parse "$BASE" | git hash-object -w --stdin),mariadb/UPSTREAM"
  git write-tree
)
rm -rf "$(dirname "$INDEX")"
PRISTINE=$(GIT_AUTHOR_NAME=rebrand GIT_AUTHOR_EMAIL=rebrand@localhost \
  GIT_COMMITTER_NAME=rebrand GIT_COMMITTER_EMAIL=rebrand@localhost \
  git commit-tree "$PRISTINE_TREE" -p "$BASE" -m "upstream $SHORT with the fork's files")
git checkout -q -f --detach "$PRISTINE"

node mariadb/rebrand.mjs
git add -A
# The commit hook's formatting (lint-staged: prettier, eslint --fix) on everything the rules changed.
node scripts/pre-commit.js
git add -A
TREE=$(git write-tree)

if [ "$MODE" = check ]; then
  if git diff --quiet "$ORIG" "$TREE"; then
    echo "branding is up to date (upstream $SHORT)"
    exit 0
  fi
  echo "HEAD differs from what the rebrand generates (upstream $SHORT):" >&2
  git diff --stat "$ORIG" "$TREE" | tail -20 >&2
  echo "edit mariadb/ instead of the generated files, then run mariadb/sync-upstream.sh --regenerate" >&2
  exit 1
fi

if [ "$TREE" = "$(git rev-parse "$ORIG^{tree}")" ]; then
  echo "branding is already up to date (upstream $SHORT); nothing to commit"
  exit 0
fi
if [ "$MODE" = regenerate ] || git merge-base --is-ancestor "$BASE" "$ORIG"; then
  NEW=$(git commit-tree "$TREE" -p "$ORIG" \
    -m "Regenerate the branding (mariadb/rebrand.mjs)" -m "Upstream: $SHORT")
else
  NEW=$(git commit-tree "$TREE" -p "$ORIG" -p "$BASE" \
    -m "Sync with upstream $SHORT ($(git log -1 --format=%cs "$BASE"))" -m "Upstream: $BASE")
fi
# The index and working tree already hold the new tree: move the branch and attach HEAD to it.
git update-ref "refs/heads/$BRANCH" "$NEW" "$ORIG"
git symbolic-ref HEAD "refs/heads/$BRANCH"
DONE=true
echo "$BRANCH is now $(git log -1 --format='%h %s')"

corepack pnpm install --frozen-lockfile
node mariadb/check-leaks.mjs
if $VERIFY; then
  node mariadb/verify.mjs
fi

if $PR; then
  BODY="Moves the fork to upstream commit QwenLM/qwen-code@$BASE and regenerates the branding (mariadb/sync-upstream.sh).

Merge with **Create a merge commit**, never squash or rebase: the merge keeps the upstream commit as a parent of main."
  git push -u origin "$BRANCH"
  gh pr create --base main --head "$BRANCH" --title "Sync with upstream $SHORT" --body "$BODY"
fi
