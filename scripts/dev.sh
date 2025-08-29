#!/usr/bin/env bash
set -e

echo "→ install dependencies (pnpm)…"
if ! command -v pnpm >/dev/null 2>&1; then
  npm i -g pnpm
fi

pnpm install
echo "✅ siap! jalankan: pnpm dev:web"
