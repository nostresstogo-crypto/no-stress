# NoStress API — Déploiement VPS

Déploie le backend (`artifacts/api-server`) sur ton VPS Linux avec :
- **Node.js 20** + **pnpm** + **PM2**
- **PostgreSQL 16** local
- **Nginx** reverse proxy + **Let's Encrypt** TLS
- **CI/CD** via GitHub Actions (push `main` → déploiement auto)

Domaine cible : **`api.no-stress.net`**

---

## 1. Bootstrap du VPS (une seule fois)

Connecte-toi en SSH **en root** (ou avec sudo) sur ton VPS, puis :

```bash
# Récupère le script depuis ton repo (ou scp-le)
curl -fsSL https://raw.githubusercontent.com/nostresstogo-crypto/no-stress/main/deploy/server-setup.sh -o /tmp/setup.sh
sudo bash /tmp/setup.sh
```

Ce script installe et configure :
- Node 20, pnpm, PM2
- PostgreSQL (crée la base `nostress` + utilisateur `nostress`)
- Nginx (vhost `api.no-stress.net` proxy vers `127.0.0.1:8080`)
- Certbot (cert TLS Let's Encrypt — assure-toi que le DNS A de `api.no-stress.net` pointe déjà sur l'IP du VPS)
- UFW firewall (autorise SSH + 80/443)
- Crée l'utilisateur système `nostress` + arborescence `/var/www/nostress-api/{releases,shared,current}`
- Génère un fichier `.env` initial dans `/var/www/nostress-api/shared/.env` avec :
  - `DATABASE_URL` (mot de passe PG aléatoire généré)
  - `JWT_SECRET` aléatoire
  - `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` (à changer)

> ⚠️ **Édite ensuite `/var/www/nostress-api/shared/.env`** pour ajuster :
> - `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`
> - SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, …)
> - `SENTRY_DSN_API` (optionnel)

---

## 2. Configurer SSH pour GitHub Actions

Sur le VPS, en tant qu'utilisateur **`nostress`** :

```bash
sudo -iu nostress
ssh-keygen -t ed25519 -N "" -f ~/.ssh/github_actions
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/github_actions   # ← copie cette clé PRIVÉE
```

Sur GitHub → Settings → Secrets and variables → **Actions → New repository secret**, ajoute :

| Secret           | Valeur                                                |
|------------------|-------------------------------------------------------|
| `VPS_HOST`       | IP ou hostname du VPS (ex: `vps.no-stress.net`)       |
| `VPS_USER`       | `nostress`                                            |
| `VPS_SSH_KEY`    | Le contenu de la clé **privée** ci-dessus              |
| `VPS_PORT`       | `22` (ou ton port SSH custom — optionnel)             |

---

## 3. Premier déploiement

Déclenche manuellement le workflow ou push sur `main` :

```bash
git push origin main
# OU dans l'onglet Actions → "Deploy API to VPS" → Run workflow
```

Le workflow va :
1. Build le bundle esbuild de l'API server (sur runner GitHub)
2. Préparer un tarball avec : `dist/`, `ecosystem.config.cjs`, `package.json` slim (runtime deps), `drizzle/` (sources schéma)
3. SCP vers `/var/www/nostress-api/releases/<sha>/`
4. SSH → exécuter `release.sh <sha>` qui :
   - `pnpm install --prod` (installe bcryptjs, nodemailer, pg, pino-pretty)
   - lance `drizzle-kit push` (crée/met à jour les tables)
   - bascule le symlink `current` → nouvelle release
   - `pm2 reload nostress-api`
   - garde les 5 dernières releases
5. Health check sur `https://api.no-stress.net/health`

---

## 4. Architecture déployée

```
/var/www/nostress-api/
├── current → releases/abc123/          (symlink, mis à jour à chaque deploy)
├── releases/
│   ├── abc123/
│   │   ├── dist/index.mjs              ← bundle esbuild
│   │   ├── package.json                ← slim, runtime deps externalisés
│   │   ├── ecosystem.config.cjs        ← config PM2
│   │   ├── drizzle/                    ← schéma DB (pour `drizzle-kit push`)
│   │   ├── .env → ../../shared/.env    (symlink)
│   │   └── node_modules/
│   └── def456/...
└── shared/
    ├── .env                            ← persistant entre releases
    ├── logs/{out,err}.log              ← logs PM2
    └── uploads/{private,public}/       ← stockage local des images
```

---

## 5. Stockage des images

Le code supporte deux drivers, sélectionnés via la variable d'env `OBJECT_STORAGE_DRIVER` :

### ✅ Option A — Stockage local sur disque (par défaut sur le VPS)

`server-setup.sh` configure automatiquement :
```env
OBJECT_STORAGE_DRIVER=local
PUBLIC_BASE_URL=https://api.no-stress.net
STORAGE_HMAC_SECRET=<aléatoire généré>
PRIVATE_OBJECT_DIR=/var/www/nostress-api/shared/uploads/private
PUBLIC_OBJECT_SEARCH_PATHS=/var/www/nostress-api/shared/uploads/public
```

Comment ça marche :
- Le mobile demande une URL d'upload via `POST /storage/uploads/request-url`
- Le backend renvoie une URL signée HMAC : `https://api.no-stress.net/storage/uploads/local/<id>?exp=…&token=…` (TTL 15 min)
- Le mobile fait un `PUT` direct avec les bytes de l'image (≤ 10 Mo)
- Le backend valide le token, écrit dans `/var/www/nostress-api/shared/uploads/private/uploads/<id>` + un sidecar `.meta.json` (contentType, size, ACL)
- L'image est ensuite servie via `GET /storage/objects/uploads/<id>` (avec ACL appliquée)

L'arborescence `shared/uploads/` est **persistante entre releases** (montée hors du dossier `current` style Capistrano). Pense à la sauvegarder régulièrement (rsync, restic, borgbackup, …).

### Option B — Garder Replit Object Storage (GCS) depuis le VPS

Si tu préfères stocker ailleurs que sur le disque du VPS :

1. Récupère un service-account JSON GCS du bucket Replit, place-le sur le VPS :
   ```bash
   sudo nano /var/www/nostress-api/shared/gcp-key.json
   sudo chown nostress:nostress /var/www/nostress-api/shared/gcp-key.json
   sudo chmod 600 /var/www/nostress-api/shared/gcp-key.json
   ```
2. Édite `/var/www/nostress-api/shared/.env` :
   ```
   OBJECT_STORAGE_DRIVER=gcs
   GOOGLE_APPLICATION_CREDENTIALS=/var/www/nostress-api/shared/gcp-key.json
   DEFAULT_OBJECT_STORAGE_BUCKET_ID=<ton-bucket-id>
   PRIVATE_OBJECT_DIR=/<bucket-id>/.private
   PUBLIC_OBJECT_SEARCH_PATHS=/<bucket-id>/public
   ```
3. Ajoute `@google-cloud/storage` à `deploy/release-package.json` (pas inclus par défaut pour alléger le bundle local).
4. `pm2 reload nostress-api`.

---

## 6. Commandes utiles sur le VPS

```bash
# Voir les logs en temps réel
sudo -u nostress pm2 logs nostress-api

# Statut
sudo -u nostress pm2 status

# Restart manuel
sudo -u nostress pm2 reload nostress-api

# Voir les requêtes nginx
sudo tail -f /var/log/nginx/access.log

# Tester la base
sudo -u postgres psql nostress -c "\dt"

# Renouveler manuellement le cert (cron auto déjà installé par certbot)
sudo certbot renew
```

---

## 7. Rollback

```bash
sudo -iu nostress
cd /var/www/nostress-api/releases
ls -1tr   # liste les releases dans l'ordre
ln -sfn /var/www/nostress-api/releases/<ancien_sha> /var/www/nostress-api/current
pm2 reload nostress-api
```

---

## 8. Variables d'environnement requises

Voir `/var/www/nostress-api/shared/.env` (généré par `server-setup.sh`).

| Variable                    | Requis | Notes |
|-----------------------------|--------|-------|
| `NODE_ENV`                  | ✅     | `production` |
| `PORT`                      | ✅     | `8080` (proxifié par nginx) |
| `DATABASE_URL`              | ✅     | Postgres local |
| `JWT_SECRET`                | ✅     | Aléatoire 48+ chars |
| `INITIAL_ADMIN_EMAIL`       | ✅     | Premier compte admin créé au boot |
| `INITIAL_ADMIN_PASSWORD`    | ✅     | Idem |
| `PRIVATE_OBJECT_DIR`        | ✅     | Stockage privé |
| `PUBLIC_OBJECT_SEARCH_PATHS`| ✅     | Stockage public |
| `LOG_LEVEL`                 | ⚪     | `info` par défaut |
| `SMTP_HOST` / `_USER` / `_PASS` / `_PORT` | ⚪ | Pour les emails |
| `SENTRY_DSN_API`            | ⚪     | Monitoring erreurs |
| `REDIS_URL`                 | ⚪     | Cache (optionnel) |
