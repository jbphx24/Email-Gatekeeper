#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# build.sh — Build the email-gate project for external deployment
#
# Run from the repo root:  bash deploy/build.sh
#
# Output:
#   dist-deploy/
#   ├── api-server/
#   │   ├── dist/index.mjs      ← compiled Node.js server (single file)
#   │   └── public/             ← protected static website
#   └── email-gate/
#       └── public/             ← compiled email-gate SPA (static files)
# ---------------------------------------------------------------------------
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO_ROOT/dist-deploy"

echo "==> Installing dependencies..."
cd "$REPO_ROOT"
pnpm install --frozen-lockfile

echo "==> Building all packages..."
# BASE_PATH and PORT are required by the Vite config; PORT is only used
# by the dev server — any value works during a production build.
BASE_PATH=/ PORT=3000 pnpm run build

echo "==> Assembling deployment bundle at dist-deploy/ ..."
rm -rf "$OUT"
mkdir -p "$OUT/api-server/dist"
mkdir -p "$OUT/email-gate"

# API server: compiled CJS bundle
cp -r "$REPO_ROOT/artifacts/api-server/dist/." "$OUT/api-server/dist/"

# API server: protected static website (served at /site/)
cp -r "$REPO_ROOT/artifacts/api-server/public" "$OUT/api-server/public"

# Email gate: compiled SPA (NGINX serves this for /)
cp -r "$REPO_ROOT/artifacts/email-gate/dist/public" "$OUT/email-gate/public"

echo ""
echo "Done! Deployment bundle is ready at: dist-deploy/"
echo ""
echo "Transfer to your server with:"
echo "  rsync -avz dist-deploy/ user@your-server:/opt/email-gate/"
echo ""
echo "Then follow DEPLOYMENT.md to complete the server setup."
