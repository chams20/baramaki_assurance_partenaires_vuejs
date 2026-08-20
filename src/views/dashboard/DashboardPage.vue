<template>
  <div class="dashboard">
    <header class="dash-header">
      <div class="dash-brand">
        <img src="/img/logo_1024.png" alt="BARAMAKI" class="dash-brand-logo" />
        <span class="dash-brand-name">BARAMAKI <span class="dash-brand-accent">Partenaires</span></span>
      </div>
      <button type="button" class="logout-btn" @click="handleLogout">
        <i class="bi bi-box-arrow-right"></i> Déconnexion
      </button>
    </header>

    <main class="dash-main">
      <div class="hero">
        <p class="hero-greeting">Bienvenue,</p>
        <h1 class="hero-name">{{ displayName }}</h1>
      </div>

      <!-- Honnête plutôt que de fabriquer des chiffres : la Phase 3 (clés
           API, tables geo_api_clients/geo_api_keys/geo_api_requests) n'est
           pas construite côté back — voir
           docs/refonte-backend/09-api-adressage-partenaires.md §5 et
           11-espace-partenaires-vuejs.md côté back. Rien à afficher ici tant
           que ça n'existe pas. -->
      <div class="placeholder-card">
        <div class="placeholder-icon"><i class="bi bi-key"></i></div>
        <h2 class="placeholder-title">Votre clé API arrive bientôt</h2>
        <p class="placeholder-text">
          Cet espace affichera votre clé d'accès à l'API d'adressage BARAMAKI, votre consommation et
          les conditions de votre contrat. La connexion fonctionne déjà — le reste est en cours de
          construction.
        </p>
      </div>
    </main>
  </div>
</template>

<script>
import authStore from '@/services/auth/authStore'
import { logout } from '@/services/auth/authService'

export default {
  name: 'DashboardPage',
  computed: {
    displayName() {
      const profile = authStore.user?.profile
      return profile?.firstName || authStore.user?.displayNames?.short || authStore.user?.username || 'Utilisateur'
    },
  },
  methods: {
    async handleLogout() {
      await logout()
      this.$router.push('/login')
    },
  },
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: var(--color-bg);
}

.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.dash-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dash-brand-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.dash-brand-name {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1rem;
  color: var(--color-primary);
  letter-spacing: 0.02em;
}

.dash-brand-accent {
  color: var(--color-accent-dark);
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-nav);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.logout-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.dash-main {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}

.hero {
  margin-bottom: 28px;
}

.hero-greeting {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0 0 2px;
  font-family: var(--font-nav);
}

.hero-name {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.6rem;
  color: var(--color-primary);
  margin: 0;
}

.placeholder-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 40px 32px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(4, 6, 119, 0.06);
}

.placeholder-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: rgba(4, 6, 119, 0.08);
  color: var(--color-primary);
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--color-heading);
  margin: 0 0 10px;
}

.placeholder-text {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
  max-width: 440px;
  margin-inline: auto;
}
</style>
