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
#    - Clé SSH disponible dans ~/.ssh/id_ed25519 (voir ci-dessous)
#
#  Créer la clé SSH avant d'utiliser ce script :
#    mkdir -p ~/.ssh
#    printf '%s\n' "$VPS_SSH_KEY" > ~/.ssh/id_ed25519
#    chmod 600 ~/.ssh/id_ed25519
#
#  Usage :
#    VPS_HOST=1.2.3.4 VPS_USER=root bash deploy/test/dump-and-transfer.sh
#
#  Variables d'environnement :
#    VPS_HOST              — IP ou domaine du VPS (obligatoire)
#    VPS_USER              — utilisateur SSH (défaut: root)
#    VPS_PORT              — port SSH (défaut: 22)
#    VPS_SSH_KEY_PATH      — chemin vers la clé SSH (défaut: ~/.ssh/id_ed25519)
#    TEST_DB_NAME          — nom de la base test (défaut: nostress_test)
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────
VPS_HOST="${VPS_HOST:?Définissez VPS_HOST (ex: 123.45.67.89)}"
VPS_PORT="${VPS_PORT:-22}"
VPS_USER="${VPS_USER:-root}"
VPS_SSH_KEY_PATH="${VPS_SSH_KEY_PATH:-$HOME/.ssh/id_ed25519}"
TEST_ENV_FILE="/var/www/nostress-test-api/shared/.env"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="/tmp/nostress_dump_${TIMESTAMP}.sql.gz"
REMOTE_DUMP="/tmp/nostress_dump_${TIMESTAMP}.sql.gz"

SSH_OPTS="-p $VPS_PORT -i $VPS_SSH_KEY_PATH -o StrictHostKeyChecking=no -o BatchMode=yes"
SCP_OPTS="-P $VPS_PORT -i $VPS_SSH_KEY_PATH -o StrictHostKeyChecking=no -o BatchMode=yes"

echo "════════════════════════════════════════════════════════════════"
echo " NoStress — Export DB Replit → VPS Test"
echo " Timestamp : $TIMESTAMP"
echo " VPS       : $VPS_USER@$VPS_HOST:$VPS_PORT"
echo "════════════════════════════════════════════════════════════════"
echo ""

# ── Vérifications ─────────────────────────────────────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL non définie dans l'environnement Replit."
  exit 1
fi

if ! command -v pg_dump &>/dev/null; then
  echo "❌ pg_dump introuvable."
  exit 1
fi

if [[ ! -f "$VPS_SSH_KEY_PATH" ]]; then
  echo "❌ Clé SSH introuvable : $VPS_SSH_KEY_PATH"
  echo ""
  echo "   Créez-la avec :"
  echo "   mkdir -p ~/.ssh"
  echo "   printf '%s\n' \"\$VPS_SSH_KEY\" > ~/.ssh/id_ed25519"
  echo "   chmod 600 ~/.ssh/id_ed25519"
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
echo "▶ Transfert vers le VPS..."
scp $SCP_OPTS "$DUMP_FILE" "$VPS_USER@$VPS_HOST:$REMOTE_DUMP"
echo "✅ Fichier transféré."
echo ""

# ── Import sur le VPS ─────────────────────────────────────────────────────
echo "▶ Import dans la base test sur le VPS..."
ssh $SSH_OPTS "$VPS_USER@$VPS_HOST" bash << REMOTESCRIPT
set -euo pipefail

REMOTE_DUMP="$REMOTE_DUMP"
TEST_ENV_FILE="$TEST_ENV_FILE"

if [[ ! -f "\$TEST_ENV_FILE" ]]; then
  echo "❌ \$TEST_ENV_FILE introuvable. Lancez d'abord deploy/test/setup.sh."
  exit 1
fi

# Lire DATABASE_URL directement depuis le .env
DB_URL="\$(grep -E '^DATABASE_URL=' "\$TEST_ENV_FILE" | cut -d= -f2-)"
if [[ -z "\$DB_URL" ]]; then
  echo "❌ DATABASE_URL absent de \$TEST_ENV_FILE."
  exit 1
fi

echo "  Base cible : \$(echo "\$DB_URL" | sed -E 's|postgresql://[^:]+:[^@]+@||')"

# Couper les connexions actives
sudo -u postgres psql -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = (
    SELECT regexp_replace('\$DB_URL', '.*/', '')
  ) AND pid <> pg_backend_pid();
" 2>/dev/null || true

# Import — psql accepte directement une DATABASE_URL complète
gunzip -c "\$REMOTE_DUMP" \
  | psql "\$DB_URL" \
    2>&1 | grep -v "^NOTICE\|^WARNING\|already exists\|does not exist" || true

echo "✅ Import terminé."
rm -f "\$REMOTE_DUMP"
echo "✅ Fichier temporaire supprimé."

# Redémarrage de l'API test
sudo systemctl restart nostress-test-api.service
echo "✅ API test redémarrée."
REMOTESCRIPT

echo ""
rm -f "$DUMP_FILE"
echo "════════════════════════════════════════════════════════════════"
echo " ✅ Base de données test synchronisée avec Replit !"
echo "════════════════════════════════════════════════════════════════"
