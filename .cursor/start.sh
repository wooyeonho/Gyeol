#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-$HOME/.npm}"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

mkdir -p "$HOME/.npm"
mkdir -p "$ROOT_DIR/.next/cache"

if [ ! -d "$ROOT_DIR/node_modules" ]; then
  bash "$ROOT_DIR/.cursor/install.sh"
fi

printf '%s\n' "GYEOL cloud environment ready."
printf '%s\n' "Run: npm run typecheck && npm run test && npm run build"
