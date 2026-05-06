#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
#  Runs on the VPS at the end of every nostress-web deploy.
#  Invoked over SSH by .github/workflows/deploy-web.yml.
#
#  Assumes the new release (the contents of `build/`) has been rsync'd to:
#      /var/www/nostress-web/releases/<sha>/
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RELEASE_SHA="${1:?missing release sha}"
APP_DIR="/var/www/nostress-web"
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

echo "✅ web release $RELEASE_SHA live"
