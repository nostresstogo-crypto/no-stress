#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
#  Runs on the VPS at the end of every nostress-admin deploy.
#  Invoked over SSH by .github/workflows/deploy-admin.yml.
#
#  Assumes the new release (the contents of `dist/`) has been rsync'd to:
#      /var/www/nostress-admin/releases/<sha>/
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RELEASE_SHA="${1:?missing release sha}"
APP_DIR="/var/www/nostress-admin"
RELEASE_DIR="$APP_DIR/releases/$RELEASE_SHA"
KEEP_RELEASES=5

[[ -f "$RELEASE_DIR/index.html" ]] || {
  echo "❌ $RELEASE_DIR/index.html missing — release upload incomplete."
  exit 1
}

echo "▶ Switching 'current' symlink → $RELEASE_SHA"
ln -sfn "$RELEASE_DIR" "$APP_DIR/current"

echo "▶ Reloading nginx (so it re-stats the symlink)"
sudo systemctl reload nginx

echo "▶ Pruning old releases (keep last $KEEP_RELEASES)"
cd "$APP_DIR/releases"
ls -1tr | head -n -"$KEEP_RELEASES" | xargs -r rm -rf

echo "✅ admin release $RELEASE_SHA live"
