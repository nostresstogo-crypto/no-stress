# NoStress — Plateforme d'événements togolaise

## Vue d'ensemble

Monorepo pnpm TypeScript pour une plateforme de découverte d'événements et billetterie mobile au Togo.

## Déploiement production

VPS unique OVH `vps117164` (Ubuntu Noble), user `nostress`, secrets GitHub Actions partagés : `VPS_HOST`, `VPS_USER=nostress`, `VPS_PORT=22`, `VPS_SSH_KEY` (ed25519).

### API — `https://api.no-stress.net/api/*`

- **Workflow** : `.github/workflows/deploy-api.yml` (paths : `artifacts/api-server/**`, `lib/db/**`, `lib/api-zod/**`, `deploy/**`)
- **Process** : systemd `nostress-api.service`, port `8080`, derrière nginx HTTPS Let's Encrypt.
- **Layout** : `/var/www/nostress-api/{releases/<sha>/, shared/.env, shared/logs/, current}`.
- **Scripts** : `deploy/server-setup.sh` (bootstrap one-shot), `deploy/release.sh` (par deploy : drizzle push, swap symlink, restart).
- **Gotcha drizzle catalog** : `release.sh` réécrit `drizzle/package.json` pour remplacer `catalog:` par les versions explicites (le VPS n'a pas de `pnpm-workspace.yaml`). Si le root catalog change, mettre à jour le mapping dans `release.sh`.

### Admin — `https://admin.no-stress.net`

- **Workflow** : `.github/workflows/deploy-admin.yml` (paths : `artifacts/nostress-admin/**`, `lib/api-zod/**`, `deploy/admin/**`)
- **Type** : SPA Vite statique, servie directement par nginx — pas de service systemd.
- **Layout** : `/var/www/nostress-admin/{releases/<sha>/, current}`.
- **Scripts** : `deploy/admin/setup.sh` (bootstrap one-shot : nginx vhost, sudoers reload nginx), `deploy/admin/release.sh` (par deploy : swap symlink + reload nginx).
- **Routage nginx** : `/api/*` et `/storage/*` proxiés vers `127.0.0.1:8080` (le service API local) → pas de CORS, même origine. Tout le reste sert `index.html` (SPA fallback).
- **Build** : `BASE_PATH=/` (vs `/nostress-admin` en dev Replit) — `lib/api.ts` calcule `API_BASE = "/api"` automatiquement.

### Limitation Replit Git

Le token OAuth GitHub de Replit n'a pas le scope `workflow` → impossible de pusher des modifs dans `.github/workflows/*` depuis Replit. Workaround : éditer ces fichiers directement via l'UI GitHub. Le contenu du workflow admin est versionné dans `deploy/admin/deploy-admin.yml.template` pour copier-coller.

## Stack technique

- **Monorepo** : pnpm workspaces
- **Node.js** : v24, TypeScript 5.9
- **API** : Express 5 + Drizzle ORM + PostgreSQL (Replit)
- **Storage** : driver à 2 backends — `gcs` (Replit Object Storage, défaut en dev) ou `local` (disque local, utilisé sur le VPS). Sélection via `OBJECT_STORAGE_DRIVER` env var. Voir `artifacts/api-server/src/lib/objectStorage.ts` et `deploy/README.md` §5.
- **Mobile** : React Native + Expo (expo-router)
- **Admin web** : React + Vite + Tailwind
- **Site public** : React + react-scripts (CRA 5.0.1, Tailwind v3)
- **Cartes** : Leaflet + React-Leaflet (tuiles CartoDB Voyager)
- **Charts** : Recharts (statistiques admin)

## Structure

```
artifacts/
  api-server/      — Express API (@workspace/api-server)
  nostress/        — App mobile Expo (@workspace/nostress)
  nostress-admin/  — Panel admin React (@workspace/nostress-admin)
  nostress-web/    — Site public React (@workspace/nostress-web)
  mockup-sandbox/  — Sandbox composants Vite
```

## Persistance

- PostgreSQL via `DATABASE_URL` (table schémas dans `lib/db/src/schema/index.ts`).
- Tables : `users`, `partners`, `events`, `registration_log`, `contact_messages`, `deletion_requests`, `publications`, `admins`, `refresh_tokens`.
- Migrations : `pnpm --filter @workspace/db drizzle-kit push`.
- IDs sérialisés en string dans toutes les réponses API (compat client mobile).

## Sécurité & santé (API)

- **Logs pino** : redaction automatique des champs sensibles (`password`, `token`, `refreshToken`, `verificationCode`, `otp`, `secret`, `apiKey`, en-têtes `Authorization`/`Cookie`/`Set-Cookie`/`x-refresh-token`). Le serializer pino-http n'expose que `method`, `url`, `statusCode` (pas le body).
- **helmet** activé sur toutes les routes : X-Frame-Options, X-Content-Type-Options, Referrer-Policy, COOP, CORP, etc. HSTS activé en production uniquement.
- `app.set("trust proxy", 1)` pour récupérer la vraie IP client derrière le proxy Replit (rate limiting + logs).
- **`/api/healthz`** : liveness (process up). Retourne 200 immédiatement.
- **`/api/readyz`** : readiness (process + DB). Ping `select 1` ; 200 si OK, 503 si la DB est injoignable. À utiliser pour les health checks de load balancer.

## Pages légales (App Store / Google Play)

- **Site web** : `/politique-confidentialite`, `/conditions-utilisation`, `/suppression-compte` (via `nostress-web/src/pages/{Privacy,TermsOfUse,AccountDeletion}.tsx`).
- **App mobile** : pages standalone in-app `app/legal/terms.tsx` + `app/legal/privacy.tsx` (route `/legal/terms`, `/legal/privacy`). Contenu localisé FR/EN.
- **Checkbox obligatoire** sur les 2 formulaires d'inscription mobile (user + structure) dans `auth.tsx` — bloque le submit tant que non cochée. Liens "CGU" et "Politique" tappables avant acceptation (router.push).
- Contact officiel : nostresstogo@gmail.com / WhatsApp +1 319 777 4884.

## Authentification

- **Hash mots de passe** : bcryptjs (cost 12) sur `users`, `partners`, `admins`.
- **JWT** signés HS256 avec `JWT_SECRET`. Sujet : `u_<id>` (user), `p_<id>` (partner), `a_<id>` (admin).
- **Access token** : 1h. **Refresh token** : 30j, stocké haché en DB (`refresh_tokens`), format `<id>.<secret>`.
- **Rotation** : `/auth/refresh` révoque l'ancien et émet un nouveau pair (réutilisation = 401).
- **Logout** : `/auth/logout` (et `/admin/logout`) révoque le refresh token côté serveur.
- **Rate limiting** par IP : login 10/15min, register 5/h, refresh 30/15min, verify-email 10/15min, resend 5/h.
  - Backend Redis si `REDIS_URL` est défini (multi-instance safe), sinon repli mémoire.
  - INCR + EXPIRE NX atomique côté Redis ; fallback mémoire si Redis tombe (fail-open).
- **Email verification (refonte mai 2026)** : code 6 chiffres, expiration 24h. **OTP obligatoire AVANT toute session** pour users ET partners.
  - `/auth/register` (user) : génère code, envoie email, retourne `{pendingVerification, email}` — **pas de token**.
  - `POST /auth/verify-email` (public) `{email, code}` : vérifie + crée session user (token+refresh). Si déjà vérifié → 400 `alreadyVerified` (pas de token mint pour empêcher takeover par email seul).
  - `POST /auth/resend-verification` `{email}` (public).
  - `/partners/register` : génère code OTP, envoie email, retourne `{pendingVerification, email}` — **pas de token**.
  - `POST /partners/verify-email` (public) : vérifie email partner — toujours **pas de token** (attend approbation admin), retourne `{verified, needsApproval, partnerStatus}`.
  - `POST /partners/resend-verification`.
  - `/auth/login` : refuse `role=admin` avec 403 `adminWebOnly` (admin uniquement via web). Bloque user/partner non vérifié → 403 `needsVerification`. Bloque partner `status !== "approved"` → 403 `partnerStatus: "pending"|"rejected"` (pas de token émis).
- **Inscription partenaire** : pas de password au formulaire. Backend génère password random au register (hash stocké). À l'approbation admin, NOUVEAU password régénéré, hashé, envoyé par email (sendMailOrThrow). Refresh_tokens du sub `p_<id>` révoqués. Si email échoue → 207 + flag `emailError:true` → POST `/admin/partners/:id/resend-credentials`.
- **Backfill** : les comptes users/partners créés AVANT cette refonte ont été grandfatherés (`UPDATE … SET email_verified=NOW() WHERE email_verified IS NULL`).
- **Clients** : `authFetch` (mobile, dans AppContext) et le helper `request` (admin web `lib/api.ts`) interceptent les 401 et rejouent automatiquement après refresh.

## Upload d'images

Flow client (mobile) : pick image → POST `/api/storage/uploads/request-url` `{name,size,contentType}` → reçoit `{uploadURL, objectPath}` → PUT le blob sur `uploadURL` → URL finale = `${API_BASE}/storage${objectPath}`.

## Credentials admin (hardcodés)

- Email : `admin@nostress.tg`
- Mot de passe : `NoStress@Admin2024!`

## API Endpoints clés

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/login` | — | Connexion client/partenaire (refuse admin+pending+rejected+unverified) |
| POST | `/api/auth/register` | — | Inscription client (envoie OTP, pas de session) |
| POST | `/api/auth/verify-email` | — | Vérifie code user → crée session |
| POST | `/api/auth/resend-verification` | — | Renvoie un code à un user |
| POST | `/api/partners/verify-email` | — | Vérifie code partner (pas de session) |
| POST | `/api/partners/resend-verification` | — | Renvoie un code à un partner |
| POST | `/api/admin/login` | — | Connexion admin |
| GET | `/api/admin/partners` | Bearer | Liste partenaires |
| PATCH | `/api/admin/partners/:id/status` | Bearer | Approuver/rejeter |
| GET/DELETE | `/api/admin/events` | Bearer | Gestion publications |
| DELETE | `/api/admin/partners/:id` | Bearer | Supprimer compte partenaire + email |
| DELETE | `/api/admin/users/:id` | Bearer | Supprimer compte utilisateur + email |
| GET | `/api/admin/registrations/stats?period=` | Bearer | Statistiques (day/week/month/year) |
| POST | `/api/admin/events/:id/approve` | Bearer | Modération : approuver une publication |
| POST | `/api/admin/events/:id/reject` | Bearer | Modération : rejeter une publication |
| GET | `/api/partners/:id/public` | — | Profil partenaire public + ses événements approuvés |
| POST | `/api/account/deletion-request` | — | Demande de suppression de compte |
| POST | `/api/contact` | — | Formulaire de contact (envoie email à l'admin + accusé de réception) |
| GET | `/api/partners/approved-map` | — | Partenaires approuvés avec coordonnées |
| GET | `/api/partners/status?email=` | — | Vérifier statut partenaire |
| POST | `/api/partners/register` | — | Inscription partenaire (sans password ni GPS) |
| PATCH | `/api/partners/me/location` | Bearer (p_) | Partenaire approuvé définit ses coords GPS |
| POST | `/api/admin/partners/:id/resend-credentials` | Bearer | Régénère password + email + révoque sessions |

## Données mock

Toutes les données sont en mémoire (pas de DB). Les tableaux `partners`, `partnerEvents`, `registrationLog` sont exportés depuis `api-server/src/routes/partners.ts` et importés dans `admin.ts`.

## Fonctionnalités implémentées

### App mobile (nostress)
- Découverte d'événements avec filtres ville/catégorie/recherche
- Achat de billets (mock)
- Favoris persistants (AsyncStorage)
- Notifications in-app (onglet Compte)
- **Alertes de proximité** : notifications automatiques quand l'utilisateur sélectionne une ville avec des événements disponibles
  - Toggle "Alertes de proximité" dans les paramètres du compte (clients uniquement)
  - Affiche le nombre d'événements dans la ville sélectionnée
  - Persiste via AsyncStorage
- Authentification client + partenaire + onboarding (3 slides : bienvenue, concert live, billetterie)
- Sélecteur de ville (23 villes togolaises avec coordonnées GPS)
- Splash screen animé : icônes flottantes, equalizer, pulse ring, palette lavender/coral/cyan
- Mode sombre/clair/système
- Bilingue FR/EN
- Suppression de compte avec choix de motif (6 raisons localisées FR/EN)
- Sélection d'image native (galerie/caméra) pour création d'événements et lieux (expo-image-picker)

### Panel admin (nostress-admin)
- Authentification admin sécurisée
- Dashboard avec statistiques globales
- Gestion partenaires (approbation/rejet) avec carte interactive (Leaflet, CartoDB Voyager)
- Gestion publications (événements des partenaires) avec message de notification auto-généré
- Demandes de suppression de compte
- Suppression de comptes partenaires (avec motif + email d'avertissement automatique)
- Suppression de publications (avec motif + email d'avertissement automatique)
- Statistiques d'inscriptions : barres Recharts par jour/semaine/mois/année

### Site public (nostress-web)
- Landing page marketing NoStress (sans section villes)

## Villes (MOCK_CITIES)

23 villes couvrant tout le Togo (de Lomé à Cinkassé) avec latitude/longitude pour l'auto-remplissage des formulaires partenaires et la carte.

## Notes développement

- URL de base admin : `BASE_URL` strip `/nostress-admin` puis ajoute `/api`
- expo-location v19 installé sur l'app mobile
- expo-image-picker installé pour sélection d'images (galerie/caméra)
- Emails : SMTP via Brevo (smtp-relay.brevo.com:587), FROM nostresstogo@gmail.com
- Emails envoyés : bienvenue, inscription partenaire, approbation/rejet, avertissement publication, suppression de compte
- Toutes les entrées dynamiques dans les emails sont échappées (escapeHtml) contre l'injection HTML
- Tous les endpoints admin DELETE nécessitent `requireAdmin` middleware (Bearer token)
- Workflows Replit gèrent chaque artifact séparément
- nostress-web utilise CRA 5.0.1 avec :
  - `pnpm.overrides`: `react-scripts>webpack-dev-server: 4.15.2` (compat Node 24)
  - `tailwind-resolve-shim.cjs` préchargé via NODE_OPTIONS pour forcer la résolution de tailwindcss vers v3 (évite la collision avec tailwindcss v4 du catalog pnpm)

## Phase 1 — Fonctionnalités utilisateur (avril 2026)

- **Favoris** : déjà câblés via `AppContext.toggleFavorite/isFavorite`, cœur sur `EventCard`, onglet "Favoris" dans `(tabs)/account.tsx`.
- **Filtres avancés home** : modal sheet sur `(tabs)/index.tsx` (date, prix, sponsorisé, tri).
- **Brouillons partenaire** : chips de filtre statut (Tous / Brouillons (=pending) / Approuvés / Rejetés) dans l'onglet Mes événements du dashboard.
- **Support WhatsApp** : ligne dédiée dans les paramètres du compte (`Linking.openURL("https://wa.me/22890000000")`). Numéro à mettre à jour dans `account.tsx` (constante `SUPPORT_WHATSAPP`).
- **Page partenaire publique** : `/partner/[id]` (Expo router) — affiche infos + événements approuvés, boutons appel/site/WhatsApp.
- **Modération admin** : page `Publications.tsx` avec filtres par statut + boutons Approuver / Rejeter / Supprimer.
- **Multilingue** : 4 langues exposées (FR, EN, Eʋegbe, Taqbaylit). Ewé/Kabye contiennent quelques traductions de base ; le reste retombe automatiquement sur le français via `translations[lang][key] || translations.fr[key]`. À enrichir progressivement dans `constants/i18n.ts` (objets `ewe`, `kab`).

### À faire (Phase 2)
- Avis & notes événements (table `reviews` + UI)
- Galerie photos/vidéos par événement (champ JSON dans `events` + composant carrousel)
- Notifications push (Expo push tokens + service)
- Statistiques détaillées partenaire (vues, conversions, panier moyen)
- Anti-fraude (rate-limiting paiements, détection doublons, captcha)
