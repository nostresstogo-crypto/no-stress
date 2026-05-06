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
(
  cd drizzle
  # The VPS has no pnpm-workspace.yaml, so `catalog:` references can't be
  # resolved. Rewrite package.json with explicit versions (kept in sync with
  # /pnpm-workspace.yaml `catalog:` block at the repo root).
  node -e '
    const fs = require("fs");
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const catalog = {
      "drizzle-orm": "^0.45.2",
      "zod": "^3.25.76",
      "@types/node": "^25.3.3",
    };
    for (const section of ["dependencies", "devDependencies"]) {
      if (!pkg[section]) continue;
      for (const [name, version] of Object.entries(pkg[section])) {
        if (version === "catalog:" && catalog[name]) {
          pkg[section][name] = catalog[name];
        }
      }
    }
    fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
  '
  # Standalone install (no workspace), then run drizzle-kit push.
  pnpm install --silent --ignore-workspace
  pnpm exec drizzle-kit push --config ./drizzle.config.ts
)

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
