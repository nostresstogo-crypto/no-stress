#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
#  Runs on the VPS at the end of every TEST API deploy.
#  Invoked over SSH by .github/workflows/deploy-test.yml.
#
#  Assumes the new release has been rsync'd to:
#      /var/www/nostress-test-api/releases/<sha>/
#  containing:
#      dist/           (built bundle)
#      package.json    (slim, lists only externals)
#      drizzle/        (lib/db sources for drizzle-kit push)
#
#  Prerequisites on the VPS (run deploy/test/setup.sh once):
#      - /var/www/nostress-test-api/shared/.env  (test env vars)
#      - systemd service: nostress-test-api.service
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RELEASE_SHA="${1:?missing release sha}"
APP_DIR="/var/www/nostress-test-api"
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
  node -e '
    const fs = require("fs");
    const path = process.env.STAGE + "/drizzle/package.json";
    const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const catalog = {
      "drizzle-orm": "^0.45.2",
      "zod": "^3.25.76",
      "@types/node": "^25.3.3",
    };
    for (const section of ["dependencies", "devDependencies"]) {
      if (!p[section]) continue;
      for (const [name, version] of Object.entries(p[section])) {
        if (version === "catalog:" && catalog[name]) {
          p[section][name] = catalog[name];
        }
      }
    }
    fs.writeFileSync("package.json", JSON.stringify(p, null, 2));
  '
  pnpm install --silent --ignore-workspace --prod=false
  pnpm exec drizzle-kit push --config ./drizzle.config.ts
)

echo "▶ Switching 'current' symlink"
ln -sfn "$RELEASE_DIR" "$APP_DIR/current"

echo "▶ Restarting nostress-test-api via systemd"
sudo systemctl restart nostress-test-api.service
sleep 2
sudo systemctl --no-pager --lines=0 status nostress-test-api.service || true

echo "▶ Pruning old releases (keep last $KEEP_RELEASES)"
cd "$APP_DIR/releases"
ls -1tr | head -n -"$KEEP_RELEASES" | xargs -r rm -rf

echo "✅ TEST API release $RELEASE_SHA live"
