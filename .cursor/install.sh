#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-$HOME/.npm}"
export npm_config_audit=false
export npm_config_fund=false

install_package_dir() {
  local dir="$1"

  if [ ! -f "$dir/package.json" ]; then
    return
  fi

  if [ -d "$dir/node_modules" ]; then
    (
      cd "$dir"
      npm install --prefer-offline --no-audit --no-fund
    )
    return
  fi

  (
    cd "$dir"
    npm ci --prefer-offline --no-audit --no-fund
  )
}

install_package_dir "$ROOT_DIR"
install_package_dir "$ROOT_DIR/openclaw"
