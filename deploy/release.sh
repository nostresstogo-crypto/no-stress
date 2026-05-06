#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
#  Runs on the VPS at the end of every deploy. Invoked over SSH by GitHub
#  Actions. Assumes the new release has been rsync'd to:
#      /var/www/nostress-api/releases/<sha>/
#  containing:
#      dist/                   (built bundle)
#      package.json            (slim, lists only externals)
#      drizzle/                (lib/db sources for `drizzle-kit push`)
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RELEASE_SHA="${1:?missing release sha}"
APP_DIR="/var/www/nostress-api"
RELEASE_DIR="$APP_DIR/releases/$RELEASE_SHA"
SHARED_ENV="$APP_DIR/shared/.env"
KEEP_RELEASES=5

cd "$RELEASE_DIR"

echo "▶ Linking shared .env"
ln -sfn "$SHARED_ENV" "$RELEASE_DIR/.env"

echo "▶ Installing production dependencies (pnpm)"
pnpm install --prod --no-frozen-lockfile --silent

echo "▶ Pushing database schema (drizzle)"
set -a; source "$SHARED_ENV"; set +a
( cd drizzle && pnpm install --silent && pnpm exec drizzle-kit push --config ./drizzle.config.ts )

echo "▶ Switching 'current' symlink"
ln -sfn "$RELEASE_DIR" "$APP_DIR/current"

echo "▶ Restarting nostress-api via systemd"
sudo systemctl restart nostress-api.service
sleep 2
sudo systemctl --no-pager --lines=0 status nostress-api.service || true

echo "▶ Pruning old releases (keep last $KEEP_RELEASES)"
cd "$APP_DIR/releases"
ls -1tr | head -n -"$KEEP_RELEASES" | xargs -r rm -rf

echo "✅ Release $RELEASE_SHA live"
