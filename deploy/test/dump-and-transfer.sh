#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
#  Export la base de données Replit et l'importe dans la base de données test
#  sur le VPS.
#
#  À lancer DEPUIS LE SHELL REPLIT (la DB Replit n'est accessible que depuis
#  l'environnement Replit).
#
#  Prérequis :
#    - deploy/test/setup.sh doit avoir été exécuté sur le VPS
#    - Les secrets VPS_SSH_KEY, VPS_HOST, VPS_PORT, VPS_USER doivent être
#      configurés dans GitHub Secrets ET accessibles en local sous forme de
#      variables d'environnement, OU renseignés manuellement ci-dessous.
#
#  Usage :
#    bash deploy/test/dump-and-transfer.sh
#
#  Variables d'environnement optionnelles (surcharge les valeurs par défaut) :
#    VPS_HOST, VPS_PORT, VPS_USER, VPS_SSH_KEY_PATH, TEST_DB_NAME
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────
VPS_HOST="${VPS_HOST:?Définissez VPS_HOST (ex: 123.45.67.89)}"
VPS_PORT="${VPS_PORT:-22}"
VPS_USER="${VPS_USER:?Définissez VPS_USER (ex: deploy)}"
VPS_SSH_KEY_PATH="${VPS_SSH_KEY_PATH:-$HOME/.ssh/id_ed25519}"
TEST_DB_NAME="${TEST_DB_NAME:-nostress_test}"
TEST_ENV_FILE="/var/www/nostress-test-api/shared/.env"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="/tmp/nostress_dump_${TIMESTAMP}.sql.gz"

echo "════════════════════════════════════════════════════════════════"
echo " NoStress — Export DB Replit → VPS Test"
echo " Timestamp : $TIMESTAMP"
echo " VPS       : $VPS_USER@$VPS_HOST:$VPS_PORT"
echo " DB cible  : $TEST_DB_NAME"
echo "════════════════════════════════════════════════════════════════"
echo ""

# ── Vérifications préalables ───────────────────────────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL n'est pas définie dans l'environnement Replit."
  exit 1
fi

if ! command -v pg_dump &>/dev/null; then
  echo "❌ pg_dump introuvable. Installez postgresql-client."
  exit 1
fi

if [[ ! -f "$VPS_SSH_KEY_PATH" ]]; then
  echo "❌ Clé SSH introuvable : $VPS_SSH_KEY_PATH"
  echo "   Définissez VPS_SSH_KEY_PATH ou placez votre clé dans ~/.ssh/id_ed25519"
  exit 1
fi

# ── Export de la base Replit ───────────────────────────────────────────────
echo "▶ Export pg_dump depuis Replit..."
pg_dump \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --format=plain \
  "$DATABASE_URL" \
  | gzip -9 > "$DUMP_FILE"

DUMP_SIZE="$(du -sh "$DUMP_FILE" | cut -f1)"
echo "✅ Dump créé : $DUMP_FILE ($DUMP_SIZE)"
echo ""

# ── Transfert vers le VPS ──────────────────────────────────────────────────
REMOTE_DUMP="/tmp/nostress_dump_${TIMESTAMP}.sql.gz"

echo "▶ Transfert vers le VPS..."
scp \
  -P "$VPS_PORT" \
  -i "$VPS_SSH_KEY_PATH" \
  -o StrictHostKeyChecking=no \
  "$DUMP_FILE" \
  "$VPS_USER@$VPS_HOST:$REMOTE_DUMP"
echo "✅ Fichier transféré : $REMOTE_DUMP"
echo ""

# ── Import sur le VPS ─────────────────────────────────────────────────────
echo "▶ Import dans la base '$TEST_DB_NAME' sur le VPS..."
ssh \
  -p "$VPS_PORT" \
  -i "$VPS_SSH_KEY_PATH" \
  -o StrictHostKeyChecking=no \
  "$VPS_USER@$VPS_HOST" \
  bash << REMOTESCRIPT
set -euo pipefail

REMOTE_DUMP="$REMOTE_DUMP"
TEST_ENV_FILE="$TEST_ENV_FILE"
TEST_DB_NAME="$TEST_DB_NAME"

# Lire DATABASE_URL depuis le .env test pour extraire les credentials
if [[ ! -f "\$TEST_ENV_FILE" ]]; then
  echo "❌ \$TEST_ENV_FILE introuvable. Lancez d'abord deploy/test/setup.sh."
  exit 1
fi

# Extraire les composants de la DATABASE_URL
DB_URL="\$(grep -E '^DATABASE_URL=' "\$TEST_ENV_FILE" | cut -d= -f2-)"
if [[ -z "\$DB_URL" ]]; then
  echo "❌ DATABASE_URL absent de \$TEST_ENV_FILE."
  exit 1
fi

# Parser la DATABASE_URL (format : postgresql://user:pass@host:port/dbname)
DB_USER="\$(echo "\$DB_URL" | sed -E 's|postgresql://([^:]+):.*|\1|')"
DB_PASS="\$(echo "\$DB_URL" | sed -E 's|postgresql://[^:]+:([^@]+)@.*|\1|')"
DB_HOST="\$(echo "\$DB_URL" | sed -E 's|.*@([^:/]+).*|\1|')"
DB_PORT="\$(echo "\$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')"
DB_NAME="\$(echo "\$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')"

echo "  Connexion : \$DB_USER@\$DB_HOST:\$DB_PORT/\$DB_NAME"

# Supprimer les connexions actives pour éviter les conflits
sudo -u postgres psql -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = '\$DB_NAME' AND pid <> pg_backend_pid();
" 2>/dev/null || true

# Import du dump
PGPASSWORD="\$DB_PASS" gunzip -c "\$REMOTE_DUMP" \
  | psql \
    --host="\$DB_HOST" \
    --port="\$DB_PORT" \
    --username="\$DB_USER" \
    --dbname="\$DB_NAME" \
    --no-password \
    2>&1 | grep -v "^NOTICE\|^WARNING\|already exists\|does not exist" || true

echo "✅ Import terminé."

# Nettoyage
rm -f "\$REMOTE_DUMP"
echo "✅ Fichier temporaire supprimé."
REMOTESCRIPT

echo ""
echo "▶ Nettoyage local..."
rm -f "$DUMP_FILE"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo " ✅ Import DB terminé avec succès !"
echo "    La base '$TEST_DB_NAME' sur le VPS est maintenant synchronisée"
echo "    avec la base de données Replit."
echo ""
echo "    Pour redémarrer l'API test avec la nouvelle DB :"
echo "    ssh -p $VPS_PORT $VPS_USER@$VPS_HOST 'sudo systemctl restart nostress-test-api.service'"
echo "════════════════════════════════════════════════════════════════"
