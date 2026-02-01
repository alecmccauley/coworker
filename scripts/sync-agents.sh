#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT_DIR/scripts/common.sh"

SOURCE_FILE="$ROOT_DIR/docs/coding_standards.md"
AGENTS_FILE="$ROOT_DIR/AGENTS.md"
CLAUDE_FILE="$ROOT_DIR/CLAUDE.md"

section "Syncing AI agent instructions"

if [[ ! -f "$SOURCE_FILE" ]]; then
  error "Source file not found: docs/coding_standards.md"
  exit 1
fi

step "Copying to AGENTS.md"
cp "$SOURCE_FILE" "$AGENTS_FILE"

step "Copying to CLAUDE.md"
cp "$SOURCE_FILE" "$CLAUDE_FILE"

success "Agent instruction files synced from docs/coding_standards.md"
