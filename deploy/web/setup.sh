#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
#  One-shot bootstrap for nostress-web (site public) on the VPS.
#
#  Run as root on the VPS, ONCE:
#      sudo bash deploy/web/setup.sh
#
#  - Creates /var/www/nostress-web/{releases,current}
#  - Installs nginx vhost for no-stress.net + www.no-stress.net (HTTPS, with
#    /api proxy to the local nostress-api service on 127.0.0.1:8080).
#  - Disables any pre-existing no-stress.net vhost (backed up to .OLD-BACKUP).
#  - Assumes Let's Encrypt cert already exists at
#    /etc/letsencrypt/live/no-stress.net/.
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="no-stress.net"
DOMAIN_WWW="www.no-stress.net"
APP_USER="nostress"
APP_DIR="/var/www/nostress-web"
API_UPSTREAM="http://127.0.0.1:8080"

log() { echo -e "\n\033[1;32m▶ $*\033[0m"; }

# ─── 1. App layout ─────────────────────────────────────────────────────────
log "Creating app layout under $APP_DIR"
mkdir -p "$APP_DIR/releases"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ─── 2. Disable existing vhost(s) for this domain ──────────────────────────
log "Backing up & disabling any existing vhost for $DOMAIN"
TS=$(date +%Y%m%d-%H%M%S)
for f in /etc/nginx/sites-enabled/*"$DOMAIN"* /etc/nginx/sites-available/*"$DOMAIN"*; do
  [[ -e "$f" ]] || continue
  # Skip the file we're about to write
  [[ "$f" == "/etc/nginx/sites-available/${DOMAIN}.conf" ]] && continue
  # Don't touch admin/api vhosts
  case "$f" in
    *admin.no-stress.net*|*api.no-stress.net*) continue ;;
  esac
  if [[ -L "$f" ]]; then
    echo "  unlink   $f"
    rm -f "$f"
  else
    echo "  backup   $f -> ${f}.OLD-BACKUP-${TS}"
    mv "$f" "${f}.OLD-BACKUP-${TS}"
  fi
done

# ─── 3. Verify Let's Encrypt cert exists ───────────────────────────────────
if [[ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
  echo "❌ No Let's Encrypt cert found at /etc/letsencrypt/live/${DOMAIN}/"
  echo "   Run: certbot --nginx -d ${DOMAIN} -d ${DOMAIN_WWW}"
  exit 1
fi

# ─── 4. Write new vhost ────────────────────────────────────────────────────
log "Installing nginx vhost for $DOMAIN"
NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}.conf"
cat > "$NGINX_SITE" <<NGINX
# Managed by deploy/web/setup.sh — do not edit manually.
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${DOMAIN_WWW};
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://${DOMAIN}\$request_uri; }
}

# Redirect www → apex
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN_WWW};
    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    return 301 https://${DOMAIN}\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root ${APP_DIR}/current;
    index index.html;

    # Static assets — long cache (CRA hashes filenames in /static/).
    location /static/ {
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # Proxy API calls to the local nostress-api service (no CORS needed).
    location /api/ {
        proxy_pass ${API_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        client_max_body_size 25m;
    }

    # Storage proxy (uploaded files served by the API).
    location /storage/ {
        proxy_pass ${API_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 25m;
    }

    # SPA fallback — every non-asset path returns index.html.
    location / {
        try_files \$uri \$uri/ /index.html;
        # index.html itself must NOT be cached (so new deploys are picked up).
        add_header Cache-Control "no-store, must-revalidate" always;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINX

ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/${DOMAIN}.conf"

# ─── 5. Test & reload nginx ────────────────────────────────────────────────
log "Testing nginx config"
nginx -t
log "Reloading nginx"
systemctl reload nginx

# ─── 6. Allow ${APP_USER} to reload nginx (used by release.sh) ────────────
log "Adding sudoers rule for nginx reload"
cat > /etc/sudoers.d/nostress-web <<SUDOERS
${APP_USER} ALL=(root) NOPASSWD: /bin/systemctl reload nginx, /usr/bin/systemctl reload nginx, /usr/sbin/nginx -t, /usr/sbin/nginx -s reload
SUDOERS
chmod 0440 /etc/sudoers.d/nostress-web
visudo -c -f /etc/sudoers.d/nostress-web

log "✅ Bootstrap complete"
echo "  Domain   : https://${DOMAIN}"
echo "  App dir  : $APP_DIR"
echo "  Vhost    : $NGINX_SITE"
echo ""
echo "👉 Next: trigger the GitHub Actions workflow 'Deploy Web to VPS' to push the first release."
