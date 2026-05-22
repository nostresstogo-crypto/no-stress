#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
#  Initialisation de l'environnement TEST sur le VPS.
#  À exécuter UNE SEULE FOIS en tant que root (ou sudo).
#
#  Ce script crée :
#    - Les répertoires de déploiement pour l'API, l'admin et le web
#    - La base de données PostgreSQL de test (nostress_test)
#    - Le fichier .env de l'API test (à remplir manuellement)
#    - Le service systemd pour l'API test
#    - Les vhosts nginx pour les 3 sous-domaines test
#    - Les certificats SSL via certbot
#
#  Usage : sudo bash deploy/test/setup.sh
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Répertoires ────────────────────────────────────────────────────────────
echo "▶ Création des répertoires de déploiement..."
for dir in \
  /var/www/nostress-test-api/releases \
  /var/www/nostress-test-api/shared \
  /var/www/nostress-test-admin/releases \
  /var/www/nostress-test-web/releases; do
  mkdir -p "$dir"
done
echo "✅ Répertoires créés."

# ── Base de données PostgreSQL test ───────────────────────────────────────
echo ""
echo "▶ Création de l'utilisateur et de la base de données PostgreSQL test..."
DB_USER="nostress_test"
DB_NAME="nostress_test"
DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"

# Créer l'utilisateur s'il n'existe pas
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  echo "ℹ️  L'utilisateur PostgreSQL '$DB_USER' existe déjà."
else
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
  echo "✅ Utilisateur '$DB_USER' créé (mot de passe généré ci-dessous)."
  echo "   Mot de passe : $DB_PASS"
  echo "   ⚠️  Notez ce mot de passe — il sera utilisé dans le .env ci-dessous."
fi

# Créer la base de données si elle n'existe pas
if sudo -u postgres psql -lqt | cut -d\| -f1 | grep -qw "$DB_NAME"; then
  echo "ℹ️  La base de données '$DB_NAME' existe déjà."
else
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
  echo "✅ Base de données '$DB_NAME' créée."
fi

# ── Fichier .env de l'API test ─────────────────────────────────────────────
ENV_FILE="/var/www/nostress-test-api/shared/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo ""
  echo "▶ Création du fichier .env test..."
  cat > "$ENV_FILE" << ENVTEMPLATE
NODE_ENV=production
PORT=3001

# Base de données TEST (PostgreSQL séparé de production)
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}

# Authentification — CHANGER cette valeur (min. 32 caractères)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')

# SMTP — peut réutiliser les mêmes identifiants que la production
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Admin
ADMIN_EMAIL=
ADMIN_CC_EMAIL=
ADMIN_BASE_URL=https://test.admin.no-stress.net

# Expo push notifications
EXPO_ACCESS_TOKEN=

# Sentry (optionnel pour le test)
SENTRY_DSN_API=

# Object Storage — peut réutiliser le même bucket ou un dédié
DEFAULT_OBJECT_STORAGE_BUCKET_ID=
PRIVATE_OBJECT_DIR=uploads/test
PUBLIC_OBJECT_SEARCH_PATHS=
ENVTEMPLATE
  echo "✅ Fichier .env créé : $ENV_FILE"
  echo "   ⚠️  Complétez les champs SMTP_*, ADMIN_EMAIL et EXPO_ACCESS_TOKEN."
else
  echo "ℹ️  $ENV_FILE existe déjà, ignoré."
fi

# ── Service systemd pour l'API test ───────────────────────────────────────
SYSTEMD_FILE="/etc/systemd/system/nostress-test-api.service"
if [[ ! -f "$SYSTEMD_FILE" ]]; then
  echo ""
  echo "▶ Création du service systemd nostress-test-api..."
  cat > "$SYSTEMD_FILE" << 'SERVICETEMPLATE'
[Unit]
Description=NoStress Test API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/nostress-test-api/current
EnvironmentFile=/var/www/nostress-test-api/shared/.env
ExecStart=/usr/bin/node --enable-source-maps dist/index.mjs
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=nostress-test-api

[Install]
WantedBy=multi-user.target
SERVICETEMPLATE
  systemctl daemon-reload
  systemctl enable nostress-test-api.service
  echo "✅ Service nostress-test-api créé et activé."
else
  echo "ℹ️  Service nostress-test-api.service existe déjà, ignoré."
fi

# ── Vhosts nginx ──────────────────────────────────────────────────────────
NGINX_CONF="/etc/nginx/sites-available/nostress-test"
if [[ ! -f "$NGINX_CONF" ]]; then
  echo ""
  echo "▶ Création de la config nginx pour les sous-domaines test..."
  cat > "$NGINX_CONF" << 'NGINXTEMPLATE'
# ── test.api.no-stress.net ───────────────────────────────────────────────
server {
    listen 80;
    server_name test.api.no-stress.net;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 20M;
    }
}

# ── test.admin.no-stress.net ─────────────────────────────────────────────
server {
    listen 80;
    server_name test.admin.no-stress.net;
    root /var/www/nostress-test-admin/current;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# ── test.no-stress.net ───────────────────────────────────────────────────
server {
    listen 80;
    server_name test.no-stress.net;
    root /var/www/nostress-test-web/current;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXTEMPLATE

  ln -sfn "$NGINX_CONF" /etc/nginx/sites-enabled/nostress-test
  nginx -t && systemctl reload nginx
  echo "✅ Config nginx créée et rechargée."
else
  echo "ℹ️  Config nginx $NGINX_CONF existe déjà, ignorée."
fi

# ── Certificats SSL (certbot) ─────────────────────────────────────────────
ADMIN_EMAIL_VALUE="$(grep -E '^ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2 | tr -d ' ')"
if [[ -n "$ADMIN_EMAIL_VALUE" ]]; then
  echo ""
  echo "▶ Demande des certificats SSL via certbot..."
  echo "  (assurez-vous que les DNS pointent déjà vers ce serveur)"
  certbot --nginx \
    -d test.api.no-stress.net \
    -d test.admin.no-stress.net \
    -d test.no-stress.net \
    --non-interactive --agree-tos \
    --email "$ADMIN_EMAIL_VALUE" \
    || echo "⚠️  Certbot a échoué. Relancez manuellement : certbot --nginx -d test.api.no-stress.net -d test.admin.no-stress.net -d test.no-stress.net"
else
  echo ""
  echo "⚠️  ADMIN_EMAIL non défini dans $ENV_FILE."
  echo "   Ajoutez-le, puis relancez certbot manuellement :"
  echo "   certbot --nginx -d test.api.no-stress.net -d test.admin.no-stress.net -d test.no-stress.net"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo " ✅ Setup terminé. Prochaines étapes :"
echo "    1. Complétez $ENV_FILE (SMTP_*, ADMIN_EMAIL, EXPO_ACCESS_TOKEN)"
echo "    2. Vérifiez que les DNS test.* pointent vers ce serveur"
echo "    3. Si ADMIN_EMAIL était vide, relancez certbot (voir ci-dessus)"
echo "    4. Pour importer la DB Replit : lancez deploy/test/dump-and-transfer.sh"
echo "       depuis le shell Replit"
echo "    5. Poussez sur la branche 'test' pour déclencher le premier déploiement"
echo "════════════════════════════════════════════════════════════════"
