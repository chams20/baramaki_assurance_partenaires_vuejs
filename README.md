# BARAMAKI — Espace Partenaires

Espace dédié aux entreprises partenaires consommant l'API d'adressage BARAMAKI (Vue 3 + Vite),
projet séparé de l'admin et du site client — voir
[`docs/refonte-backend/11-espace-partenaires-vuejs.md`](../../baramaki_assurance_back/docs/refonte-backend/11-espace-partenaires-vuejs.md)
côté back pour la décision d'architecture. Même backend Symfony, même mécanisme d'authentification
que les deux autres dépôts front.

Voir [`docs/README.md`](docs/README.md) pour toute la documentation de ce dépôt.

## Démarrer en local

```sh
npm install
npm run dev
```

L'app tourne sur `http://localhost:5175` (distinct de l'admin `5174` et du site client `5173`) et
parle au back Symfony sur `http://localhost:8000` (`VITE_APP_BACK_API_URL` dans `.env`).

## Build de production

```sh
npm run build
```

## Organisation du code

- `src/views/security/` — connexion (`LoginPage.vue`). Pas d'auto-inscription : un compte partenaire
  est créé par un admin après acceptation d'une demande, voir doc 11 côté back.
- `src/views/dashboard/` — l'espace une fois connecté (`DashboardPage.vue`), honnêtement un
  "bientôt disponible" tant que la Phase 3 (clés API) n'existe pas côté back.
- `src/services/auth/` + `src/api/apiClient.js` — mêmes fichiers, copiés à l'identique depuis
  `baramaki_assurance_admin_vuejs` (contrat JWT + refresh déjà éprouvé, rien à réinventer).
- `src/assets/design-tokens.css` — mêmes jetons de couleur que l'admin, copiés tels quels dès la
  création de ce projet plutôt que rattrapés après coup.
- `src/router/index.js` — routes + 2 gardes (hydratation de session, authentification). Pas de garde
  rôles : `ROLE_PARTNER` n'existe pas encore côté back.
