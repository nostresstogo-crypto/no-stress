# NoStress — Plateforme d'événements togolaise

## Vue d'ensemble

Monorepo pnpm TypeScript pour une plateforme de découverte d'événements et billetterie mobile au Togo.

## Stack technique

- **Monorepo** : pnpm workspaces
- **Node.js** : v24, TypeScript 5.9
- **API** : Express 5 (in-memory mock, pas de DB)
- **Mobile** : React Native + Expo (expo-router)
- **Admin web** : React + Vite + Tailwind
- **Site public** : React + Vite
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

## Credentials admin (hardcodés)

- Email : `admin@nostress.tg`
- Mot de passe : `NoStress@Admin2024!`

## API Endpoints clés

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/admin/login` | — | Connexion admin |
| GET | `/api/admin/partners` | Bearer | Liste partenaires |
| PATCH | `/api/admin/partners/:id/status` | Bearer | Approuver/rejeter |
| GET/DELETE | `/api/admin/events` | Bearer | Gestion publications |
| GET | `/api/admin/registrations/stats?period=` | Bearer | Statistiques (day/week/month/year) |
| GET | `/api/partners/approved-map` | — | Partenaires approuvés avec coordonnées |
| POST | `/api/partners/register` | — | Inscription partenaire |

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

### Panel admin (nostress-admin)
- Authentification admin sécurisée
- Dashboard avec statistiques globales
- Gestion partenaires (approbation/rejet) avec carte interactive (Leaflet, CartoDB Voyager)
- Gestion publications (événements des partenaires) avec message de notification auto-généré
- Demandes de suppression de compte
- Statistiques d'inscriptions : barres Recharts par jour/semaine/mois/année

### Site public (nostress-web)
- Landing page marketing NoStress (sans section villes)

## Villes (MOCK_CITIES)

23 villes couvrant tout le Togo (de Lomé à Cinkassé) avec latitude/longitude pour l'auto-remplissage des formulaires partenaires et la carte.

## Notes développement

- URL de base admin : `BASE_URL` strip `/nostress-admin` puis ajoute `/api`
- expo-location v19 installé sur l'app mobile
- Workflows Replit gèrent chaque artifact séparément
