#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_ROOT"

printf "==> Cleaning node_modules in %s\n" "$REPO_ROOT"
find . -name node_modules -type d -prune -exec rm -rf {} +

printf "==> Removing better-sqlite3 build artifacts\n"
find . -path "*/better-sqlite3/build" -type d -prune -exec rm -rf {} +

printf "==> Pruning pnpm store\n"
pnpm store prune

printf "==> Reinstalling dependencies\n"
pnpm install

printf "==> Rebuilding better-sqlite3\n"
pnpm rebuild better-sqlite3

printf "==> Done\n"
