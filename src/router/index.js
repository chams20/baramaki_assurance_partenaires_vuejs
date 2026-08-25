import { createRouter, createWebHistory } from 'vue-router'
import authStore, { isAuthenticated as isAuthenticatedRef } from '@/services/auth/authStore'
import { tryRestoreSession, logout } from '@/services/auth/authService'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/security/LoginPage.vue'),
      meta: { title: 'BARAMAKI Partenaires | Connexion', requiresAuth: false },
    },
    {
      // Coquille commune (header + nav persistante) à tout l'espace
      // partenaire authentifié — un seul endroit pour la largeur de
      // conteneur et la navigation, voir PartnerLayout.vue. requiresAuth/
      // roles posés ICI seulement : Vue Router fusionne le meta du parent
      // dans `to.meta` pour chaque route enfant, pas besoin de les répéter.
      path: '/',
      component: () => import('@/components/layout/PartnerLayout.vue'),
      meta: {
        requiresAuth: true,
        // Espace réservé aux partenaires — jamais à un ROLE_CLIENT/ROLE_ADMIN
        // qui se connecterait ici par erreur (le compte peut très bien avoir
        // ROLE_PARTNER EN PLUS d'un autre rôle, voir
        // docs/refonte-backend/11-espace-partenaires-vuejs.md côté back —
        // c'est la présence de ROLE_PARTNER qui compte, pas l'absence des autres).
        roles: ['ROLE_PARTNER'],
      },
      children: [
        // "/" tout nu (route index) : un visiteur non authentifié y est de
        // toute façon renvoyé vers /login par le guard requiresAuth
        // ci-dessous avant même d'atteindre cette redirection.
        { path: '', redirect: '/tableau-de-bord' },
        {
          path: 'tableau-de-bord',
          name: 'dashboard',
          component: () => import('@/views/dashboard/DashboardPage.vue'),
          meta: { title: 'BARAMAKI Partenaires | Tableau de bord' },
        },
        {
          path: 'cles-api',
          name: 'api-keys',
          component: () => import('@/views/dashboard/ApiKeysPage.vue'),
          meta: { title: 'BARAMAKI Partenaires | Clés API' },
        },
        {
          // Copie adaptée de GeoApiDocsPage.vue (admin, ROLE_SUPER_ADMIN) —
          // celle-ci est la vraie doc consultable par le partenaire lui-même,
          // voir docs/refonte-backend/14-lieux-rues-numeros.md côté back.
          path: 'documentation-api',
          name: 'api-docs',
          component: () => import('@/views/dashboard/GeoApiDocsPage.vue'),
          meta: { title: 'BARAMAKI Partenaires | Documentation API' },
        },
        {
          path: 'facturation',
          name: 'billing',
          component: () => import('@/views/dashboard/BillingPage.vue'),
          meta: { title: 'BARAMAKI Partenaires | Facturation' },
        },
        {
          path: 'forfaits',
          name: 'choose-plan',
          component: () => import('@/views/dashboard/ChoosePlanPage.vue'),
          meta: { title: 'BARAMAKI Partenaires | Forfaits' },
        },
        {
          path: 'mon-entreprise',
          name: 'my-company',
          component: () => import('@/views/dashboard/MyCompanyPage.vue'),
          meta: { title: 'BARAMAKI Partenaires | Mon entreprise' },
        },
      ],
    },
    {
      path: '/acces-refuse',
      name: 'forbidden',
      component: () => import('@/views/security/ForbiddenPage.vue'),
      meta: { title: 'BARAMAKI Partenaires | Accès refusé', requiresAuth: false },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login',
    },
  ],
})

// ────────────────────────────────────────────────────────────────────────
// Sécurité front — même schéma que les deux autres dépôts (voir leur
// router/index.js) :
//   1. Hydratation silencieuse de la session (une seule fois, au premier chargement)
//   2. Authentification requise
//   3. Rôle requis (ROLE_PARTNER) — cet espace est réservé aux partenaires,
//      un ROLE_CLIENT/ROLE_ADMIN authentifié mais sans ROLE_PARTNER ne doit
//      jamais atteindre le tableau de bord.
// ────────────────────────────────────────────────────────────────────────
let hydrationPromise = null

router.beforeEach(async () => {
  if (!authStore.hydrated) {
    hydrationPromise ??= tryRestoreSession()
    await hydrationPromise
  }
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthenticatedRef.value) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth || !to.meta.roles) return

  const userRoles = authStore.user?.roles || []
  if (userRoles.some((r) => to.meta.roles.includes(r))) return

  // Authentifié mais pas partenaire : pas de boucle silencieuse vers /login
  // (l'utilisateur EST bien connecté), une vraie page "Accès refusé" avec de
  // quoi se déconnecter proprement — puis on nettoie la session courante
  // pour ne pas laisser un compte non-partenaire "à moitié connecté" ici.
  await logout()
  return { name: 'forbidden' }
})

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = to.meta.title
  }
})

export default router
