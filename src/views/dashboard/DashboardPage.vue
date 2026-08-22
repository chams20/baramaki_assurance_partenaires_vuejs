<template>
  <div class="dashboard">
    <header class="dash-header">
      <div class="dash-brand">
        <img src="/img/logo_1024.png" alt="BARAMAKI" class="dash-brand-logo" />
        <span class="dash-brand-name">BARAMAKI <span class="dash-brand-accent">Partenaires</span></span>
      </div>
      <router-link to="/mon-entreprise" class="nav-link">
        <i class="bi bi-building"></i> Mon entreprise
      </router-link>
    </header>

    <main class="dash-main">
      <div class="hero">
        <p class="hero-greeting">Bienvenue,</p>
        <h1 class="hero-name">{{ displayName }}</h1>
      </div>

      <div v-if="loading" class="placeholder-card">
        <p class="placeholder-text">Chargement...</p>
      </div>

      <template v-else>
        <div v-if="activeSubscription" class="subscription-card">
          <div class="subscription-icon"><i class="bi bi-bookmark-check-fill"></i></div>
          <h2 class="subscription-title">Forfait {{ activeSubscription.planName }}</h2>
          <p class="subscription-price">
            {{ Number(activeSubscription.amountPaid).toLocaleString('fr-FR') }} KMF
            <span>{{ periodLabel(activeSubscription.billingPeriod) }}</span>
          </p>
          <p class="subscription-renewal">Renouvellement le {{ formatDate(activeSubscription.renewsAt) }}</p>
          <div class="subscription-actions">
            <router-link to="/forfaits" class="subscription-link subscription-link--filled">
              <i class="bi bi-arrow-up-circle"></i> Passer à un forfait supérieur
            </router-link>
            <router-link to="/forfaits" class="subscription-link subscription-link--ghost">Voir tous les forfaits</router-link>
          </div>
        </div>

        <!-- Honnête plutôt que de fabriquer des chiffres : la clé API et la
             consommation dépendent encore de geo_api_requests +
             PartnerApiKeyAuthenticator, pas construits — voir
             docs/refonte-backend/09-api-adressage-partenaires.md §5 et
             12-forfaits-partenaires.md §5 côté back. -->
        <div v-else class="placeholder-card">
          <div class="placeholder-icon"><i class="bi bi-tags"></i></div>
          <h2 class="placeholder-title">Choisissez votre forfait</h2>
          <p class="placeholder-text">
            Vous n'avez pas encore de forfait actif. Une fois abonné, cet espace affichera votre clé
            d'accès à l'API d'adressage BARAMAKI et votre consommation — la connexion fonctionne déjà, le
            reste est en cours de construction.
          </p>
          <router-link to="/forfaits" class="placeholder-cta">Voir les forfaits</router-link>
        </div>

        <!-- Aperçu de mise en page — pas encore relié à des données réelles
             (geo_api_invoices et l'auto-service de génération de clé restent
             à construire, voir docs/refonte-backend/12-forfaits-partenaires.md
             §"Facturation" et §5 résumé). États vides honnêtes plutôt que des
             chiffres fabriqués, même choix que le reste de cette page. -->
        <section class="panel-card">
          <div class="panel-head">
            <h3 class="panel-title"><i class="bi bi-receipt"></i> Facturation</h3>
          </div>
          <div class="panel-empty">
            <p>Aucune facture pour le moment. Vos factures apparaîtront ici après votre souscription et à
              chaque renouvellement.</p>
          </div>
        </section>

        <section class="panel-card">
          <div class="panel-head">
            <h3 class="panel-title"><i class="bi bi-key"></i> Clés API</h3>
          </div>
          <div class="panel-empty">
            <p>Vous n'avez pas encore de clé API à votre nom — pour l'instant, contactez BARAMAKI pour en
              obtenir une. La génération en auto-service arrive bientôt : chaque clé pourra être associée
              à une application et un nom de domaine, pour savoir en un coup d'œil ce qui l'utilise.</p>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script>
import authStore from '@/services/auth/authStore'
import { getMyClient } from '@/services/geo/geoSelfServiceService'

export default {
  name: 'DashboardPage',
  data() {
    return {
      loading: true,
      myClient: null,
    }
  },
  computed: {
    displayName() {
      const profile = authStore.user?.profile
      return profile?.firstName || authStore.user?.displayNames?.short || authStore.user?.username || 'Utilisateur'
    },
    activeSubscription() {
      return (this.myClient?.subscriptions || []).find((s) => s.status === 'active') || null
    },
  },
  methods: {
    periodLabel(period) {
      return { monthly: '/ mois', yearly: '/ 12 mois', two_years: '/ 24 mois', four_years: '/ 48 mois' }[period] || ''
    },
    formatDate(iso) {
      if (!iso) return '—'
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
    },
  },
  async mounted() {
    try {
      this.myClient = await getMyClient()
    } catch {
      this.myClient = null
    } finally {
      this.loading = false
    }
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

.nav-link {
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
  text-decoration: none;
  transition: border-color 0.15s, color 0.15s;
}

.nav-link:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.dash-main {
  max-width: 880px;
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
  margin: 0 0 20px;
  max-width: 440px;
  margin-inline: auto;
}

.placeholder-cta,
.subscription-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border-radius: 999px;
  font-family: var(--font-nav);
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.placeholder-cta {
  background: var(--color-primary);
  color: #fff;
}

.placeholder-cta:hover {
  background: var(--color-primary-dark);
}

.subscription-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.subscription-link--filled {
  background: var(--color-accent);
  color: #fff;
}

.subscription-link--filled:hover {
  background: var(--color-accent-dark);
}

.subscription-link--ghost {
  background: transparent;
  border: 1.5px solid var(--color-border);
  color: var(--color-text-secondary);
}

.subscription-link--ghost:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* ── Aperçu Facturation / Clés API ────────────────────  */
.panel-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 22px 26px;
  margin-top: 20px;
  box-shadow: 0 2px 14px rgba(4, 6, 119, 0.05);
}

.panel-head {
  margin-bottom: 10px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-primary);
  margin: 0;
}

.panel-empty p {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.subscription-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-accent);
  border-radius: 16px;
  padding: 40px 32px;
  text-align: center;
  box-shadow: 0 8px 30px color-mix(in srgb, var(--color-accent) 16%, transparent);
}

.subscription-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent-dark);
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.subscription-title {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.2rem;
  color: var(--color-heading);
  margin: 0 0 8px;
}

.subscription-price {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.3rem;
  color: var(--color-primary);
  margin: 0 0 4px;
}

.subscription-price span {
  font-family: var(--font-nav);
  font-weight: 500;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.subscription-renewal {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  margin: 0 0 20px;
}
</style>
