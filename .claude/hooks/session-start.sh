#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

if command -v claude >/dev/null 2>&1; then
  if ! claude plugin marketplace list 2>/dev/null | grep -q 'mods-do-caio'; then
    claude plugin marketplace add ./.claude/mods-do-caio
  fi
  installed="$(claude plugin list 2>/dev/null || true)"
  for p in savvy-progress escolha-de-modelo; do
    if ! printf '%s' "$installed" | grep -q "$p@mods-do-caio"; then
      claude plugin install "$p@mods-do-caio"
    fi
  done
fi

mkdir -p node_modules
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  npm install
  sha256sum .claude/hooks/session-start.sh package.json package-lock.json > "$hashes" || rm -f "$hashes"
fi
