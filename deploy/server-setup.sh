#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
#  NoStress API — One-time VPS bootstrap script
#  Runs as root. Safe to re-run (idempotent).
#
#  Usage (on the VPS, as root):
#      curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/deploy/server-setup.sh | bash
#  OR  scp this file to the VPS and:  sudo bash server-setup.sh
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="api.no-stress.net"
APP_USER="nostress"
APP_DIR="/var/www/nostress-api"
RELEASES_DIR="$APP_DIR/releases"
SHARED_DIR="$APP_DIR/shared"
NODE_VERSION="20"

PG_DB="nostress"
PG_USER="nostress"
# A random password is generated on first run, stored in /root/.nostress_db_pass
PG_PASS_FILE="/root/.nostress_db_pass"

log() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }

# ─── 1. Base packages ──────────────────────────────────────────────────────
log "Installing base packages"
apt-get update -y
apt-get install -y curl ca-certificates gnupg lsb-release ufw nginx \
    postgresql postgresql-contrib certbot python3-certbot-nginx \
    build-essential rsync git

# ─── 2. Node.js 20 (system-wide via NodeSource) ────────────────────────────
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_VERSION}* ]]; then
  log "Installing Node.js ${NODE_VERSION}"
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi

# ─── 3. pnpm + PM2 ─────────────────────────────────────────────────────────
log "Installing pnpm + PM2 globally"
npm install -g pnpm@9 pm2

# ─── 4. App user ───────────────────────────────────────────────────────────
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  log "Creating user $APP_USER"
  adduser --disabled-password --gecos "" "$APP_USER"
fi

# ─── 5. Directory layout ───────────────────────────────────────────────────
log "Setting up directories under $APP_DIR"
mkdir -p "$RELEASES_DIR" "$SHARED_DIR" "$SHARED_DIR/uploads" "$SHARED_DIR/logs"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ─── 6. PostgreSQL setup ───────────────────────────────────────────────────
log "Configuring PostgreSQL"
systemctl enable --now postgresql

if [[ ! -f "$PG_PASS_FILE" ]]; then
  PG_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  echo "$PG_PASS" > "$PG_PASS_FILE"
  chmod 600 "$PG_PASS_FILE"
else
  PG_PASS="$(cat "$PG_PASS_FILE")"
fi

sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename='$PG_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $PG_USER WITH PASSWORD '$PG_PASS';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$PG_DB'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $PG_DB OWNER $PG_USER;"

sudo -u postgres psql -d "$PG_DB" -c "GRANT ALL PRIVILEGES ON DATABASE $PG_DB TO $PG_USER;" >/dev/null
sudo -u postgres psql -d "$PG_DB" -c "GRANT ALL ON SCHEMA public TO $PG_USER;" >/dev/null

DB_URL="postgresql://${PG_USER}:${PG_PASS}@127.0.0.1:5432/${PG_DB}"

# ─── 7. .env file in shared/ (preserved across releases) ───────────────────
ENV_FILE="$SHARED_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  log "Creating $ENV_FILE (edit it after this script finishes!)"
  cat > "$ENV_FILE" <<EOF
# ─── REQUIRED ──────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
DATABASE_URL=${DB_URL}

# Auth
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
INITIAL_ADMIN_EMAIL=admin@no-stress.net
INITIAL_ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)

# Object storage — local disk driver (no GCS needed on the VPS)
OBJECT_STORAGE_DRIVER=local
PUBLIC_BASE_URL=https://${DOMAIN}
STORAGE_HMAC_SECRET=$(openssl rand -base64 48 | tr -d '\n')
PRIVATE_OBJECT_DIR=${SHARED_DIR}/uploads/private
PUBLIC_OBJECT_SEARCH_PATHS=${SHARED_DIR}/uploads/public

# ─── OPTIONAL (set if you use them) ────────────────────────────────────────
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=postmaster@no-stress.net
# SMTP_PASS=changeme
# SENTRY_DSN_API=
# REDIS_URL=redis://127.0.0.1:6379
EOF
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

mkdir -p "$SHARED_DIR/uploads/private" "$SHARED_DIR/uploads/public"
chown -R "$APP_USER:$APP_USER" "$SHARED_DIR/uploads"

# ─── 8. Nginx site ─────────────────────────────────────────────────────────
NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}.conf"
HAS_CERT=0
[[ -d "/etc/letsencrypt/live/${DOMAIN}" ]] && HAS_CERT=1

# Back up existing config so we can restore it on user request
if [[ -f "$NGINX_SITE" ]]; then
  cp "$NGINX_SITE" "${NGINX_SITE}.bak.$(date +%s)"
  log "Existing nginx config backed up to ${NGINX_SITE}.bak.*"
fi

if [[ "$HAS_CERT" == "1" ]]; then
  log "Installing nginx site for $DOMAIN (with HTTPS — existing Let's Encrypt cert detected)"
  cat > "$NGINX_SITE" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 300;
        client_max_body_size 25m;
    }
}
NGINX
else
  log "Installing nginx site for $DOMAIN (HTTP only — certbot will add HTTPS next)"
  cat > "$NGINX_SITE" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ { root /var/www/html; }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 300;
        client_max_body_size 25m;
    }
}
NGINX
fi

ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ─── 9. SSL (Let's Encrypt) ────────────────────────────────────────────────
if [[ "$HAS_CERT" == "0" ]]; then
  log "Requesting SSL cert for ${DOMAIN}"
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
          --register-unsafely-without-email --redirect || \
    echo "⚠️  certbot failed — make sure DNS A record for $DOMAIN points to this server, then run: certbot --nginx -d $DOMAIN"
else
  log "SSL cert already present for ${DOMAIN} — skipping certbot"
fi

# ─── 10. Firewall ──────────────────────────────────────────────────────────
log "Configuring UFW (allow OpenSSH + nginx)"
ufw --force enable >/dev/null 2>&1 || true
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow "Nginx Full" >/dev/null 2>&1 || true

# ─── 11. PM2 startup at boot ───────────────────────────────────────────────
log "Setting PM2 to start at boot"
sudo -u "$APP_USER" bash -c "pm2 startup systemd -u $APP_USER --hp /home/$APP_USER" || true
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" >/dev/null || true

# ─── 12. Summary ───────────────────────────────────────────────────────────
log "✅ Bootstrap complete"
echo "  Domain         : https://${DOMAIN}"
echo "  App user       : $APP_USER"
echo "  App dir        : $APP_DIR"
echo "  PG database    : $PG_DB"
echo "  PG user        : $PG_USER"
echo "  PG password    : (saved in $PG_PASS_FILE)"
echo "  Env file       : $ENV_FILE"
echo ""
echo "👉 Next steps:"
echo "  1. Edit $ENV_FILE if needed (admin password, SMTP, etc.)"
echo "  2. Add the SSH public key of GitHub Actions to /home/$APP_USER/.ssh/authorized_keys"
echo "  3. Push to main (or trigger the deploy workflow manually) — first deploy will run drizzle push"
