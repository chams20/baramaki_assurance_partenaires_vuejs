<template>
  <div class="dash-page">
    <div class="hero">
      <p class="hero-greeting">Bienvenue,</p>
      <h1 class="hero-name">{{ displayName }}</h1>
    </div>

    <div v-if="loading" class="placeholder-card">
      <p class="placeholder-text">Chargement...</p>
    </div>

    <template v-else>
      <div v-if="currentSubscription" class="subscription-card">
        <div class="subscription-icon"><i class="bi bi-bookmark-check-fill"></i></div>
        <h2 class="subscription-title">Forfait {{ currentSubscription.planName }}</h2>
        <p class="subscription-price">
          {{ Number(currentSubscription.amountPaid).toLocaleString('fr-FR') }} KMF
          <span>{{ periodLabel(currentSubscription.billingPeriod) }}</span>
        </p>
        <p v-if="currentSubscription.status === 'pending'" class="subscription-renewal subscription-renewal--pending">
          <i class="bi bi-hourglass-split"></i> En attente de votre paiement
        </p>
        <p v-else class="subscription-renewal">Renouvellement le {{ formatDate(currentSubscription.renewsAt) }}</p>
        <div class="subscription-actions">
          <router-link v-if="currentSubscription.status === 'active'" to="/forfaits" class="subscription-link subscription-link--filled">
            <i class="bi bi-arrow-up-circle"></i> Passer à un forfait supérieur
          </router-link>
          <router-link to="/forfaits" class="subscription-link subscription-link--ghost">Voir tous les forfaits</router-link>
        </div>
      </div>

      <div v-else class="placeholder-card">
        <div class="placeholder-icon"><i class="bi bi-rocket-takeoff"></i></div>
        <h2 class="placeholder-title">Connectez votre application à BARAMAKI</h2>
        <p class="placeholder-text">
          Choisissez un forfait pour obtenir votre clé d'accès à l'API d'adressage BARAMAKI et commencer à
          intégrer dès aujourd'hui — suggestions d'adresses fiables sur toutes les Comores.
        </p>
        <router-link to="/forfaits" class="placeholder-cta">Voir les forfaits</router-link>
      </div>

      <!-- Où payer — pas de paiement en ligne aux Comores, le règlement se
           fait en agence. On prend directement la position du navigateur
           plutôt que de faire chercher une adresse, voir
           docs/refonte-backend/13-agences.md §9. -->
      <div v-if="pendingInvoicesCount" class="agencies-card">
        <div class="agencies-card-head">
          <i class="bi bi-geo-alt-fill"></i>
          <h3>Où payer ?</h3>
        </div>

        <div v-if="loadingNearbyAgencies" class="agencies-loading">
          <div class="agencies-spinner"></div>
          <p>Localisation en cours...</p>
        </div>

        <div v-else-if="nearbyAgenciesError" class="agencies-error">
          <p>{{ nearbyAgenciesError }}</p>
          <button type="button" class="agencies-retry-btn" @click="requestNearbyAgencies">Réessayer</button>
        </div>

        <div v-else-if="nearbyAgencies.length" class="agencies-list">
          <p class="agencies-intro">Les agences BARAMAKI les plus proches de vous :</p>
          <div v-for="a in nearbyAgencies" :key="a.uuid" class="agency-row">
            <div class="agency-row-main">
              <span class="agency-row-name">{{ a.name }}</span>
              <span class="agency-row-address">{{ [a.addressVillage, a.addressRegion, a.addressCity].filter(Boolean).join(', ') || a.addressFullAddress || 'Adresse non renseignée' }}</span>
            </div>
            <div class="agency-row-side">
              <span class="agency-row-distance">{{ formatDistance(a.distanceKm) }}</span>
              <a v-if="a.phone" :href="`tel:${a.phone.replace(/\s+/g, '')}`" class="agency-row-phone">
                <i class="bi bi-telephone"></i> {{ a.phone }}
              </a>
            </div>
          </div>
        </div>

        <p v-else class="agencies-empty">
          Aucune agence géolocalisée près de vous pour le moment — contactez votre interlocuteur BARAMAKI
          habituel pour savoir où payer.
        </p>
      </div>

      <!-- Accès rapide — le détail (liste complète des clés, historique des
           factures) vit sur ses propres pages désormais, pas ici : sinon le
           dashboard grandit et rétrécit selon ce qu'il y a à afficher. -->
      <div class="quick-grid">
        <router-link to="/cles-api" class="quick-tile">
          <div class="quick-tile-icon quick-tile-icon--indigo"><i class="bi bi-key"></i></div>
          <div class="quick-tile-body">
            <h3>Clés API</h3>
            <p>{{ keysSummary }}</p>
          </div>
          <i class="bi bi-chevron-right quick-tile-arrow"></i>
        </router-link>

        <router-link to="/facturation" class="quick-tile">
          <div class="quick-tile-icon quick-tile-icon--teal"><i class="bi bi-receipt"></i></div>
          <div class="quick-tile-body">
            <h3>Facturation</h3>
            <p>{{ billingSummary }}</p>
          </div>
          <i class="bi bi-chevron-right quick-tile-arrow"></i>
        </router-link>
      </div>

      <!-- Honnête plutôt que de fabriquer des chiffres : le suivi de
           consommation dépend encore de geo_api_requests +
           PartnerApiKeyAuthenticator, pas construits — voir
           docs/refonte-backend/09-api-adressage-partenaires.md §5 et
           12-forfaits-partenaires.md §5 côté back. -->
      <div v-if="keys.length" class="usage-note">
        <i class="bi bi-graph-up"></i> Le suivi détaillé de votre consommation arrive bientôt sur cette page.
      </div>
    </template>
  </div>
</template>

<script>
import authStore from '@/services/auth/authStore'
import { getMyClient, getNearbyAgenciesForMe } from '@/services/geo/geoSelfServiceService'

export default {
  name: 'DashboardPage',
  data() {
    return {
      loading: true,
      myClient: null,
      nearbyAgencies: [],
      loadingNearbyAgencies: false,
      nearbyAgenciesError: null,
    }
  },
  computed: {
    displayName() {
      const profile = authStore.user?.profile
      return profile?.firstName || authStore.user?.displayNames?.short || authStore.user?.username || 'Utilisateur'
    },
    // "En cours" au sens large : `active` (payée) ou `pending` (en attente
    // du tout premier paiement) — une souscription `pending` reste "la
    // vôtre", pas absente, tant que son délai de grâce n'est pas dépassé
    // (voir GeoApiSubscription::STATUS_PENDING côté back).
    currentSubscription() {
      return (this.myClient?.subscriptions || []).find((s) => s.status === 'active' || s.status === 'pending') || null
    },
    invoices() {
      return this.myClient?.invoices || []
    },
    keys() {
      return this.myClient?.keys || []
    },
    activeKeysCount() {
      return this.keys.filter((k) => !k.isRevoked).length
    },
    pendingInvoicesCount() {
      return this.invoices.filter((inv) => inv.status !== 'paid').length
    },
    keysSummary() {
      if (!this.activeKeysCount) return 'Aucune clé active'
      return `${this.activeKeysCount} clé${this.activeKeysCount > 1 ? 's' : ''} active${this.activeKeysCount > 1 ? 's' : ''}`
    },
    billingSummary() {
      if (!this.invoices.length) return 'Aucune facture pour le moment'
      if (this.pendingInvoicesCount) return `${this.pendingInvoicesCount} facture${this.pendingInvoicesCount > 1 ? 's' : ''} en attente`
      return 'Toutes vos factures sont à jour'
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
    formatDistance(km) {
      if (km === null || km === undefined) return '—'
      return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
    },
    // Position du navigateur, jamais une adresse saisie — demande explicite
    // : "on prend ses coordonnées et on lui montre directement les agences
    // proches". Seulement demandée s'il y a réellement quelque chose à
    // payer (pendingInvoicesCount), pas à chaque visite du tableau de bord.
    requestNearbyAgencies() {
      this.nearbyAgenciesError = null
      if (!navigator.geolocation) {
        this.nearbyAgenciesError = "La géolocalisation n'est pas disponible sur cet appareil."
        return
      }
      this.loadingNearbyAgencies = true
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            this.nearbyAgencies = await getNearbyAgenciesForMe(position.coords.latitude, position.coords.longitude)
          } catch {
            this.nearbyAgenciesError = 'Erreur lors de la recherche des agences proches de vous.'
          } finally {
            this.loadingNearbyAgencies = false
          }
        },
        () => {
          this.nearbyAgenciesError = 'Position non disponible — autorisez la géolocalisation pour voir les agences les plus proches de vous.'
          this.loadingNearbyAgencies = false
        },
        { timeout: 10000, maximumAge: 300000 },
      )
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
    if (this.pendingInvoicesCount) {
      this.requestNearbyAgencies()
    }
  },
}
</script>

<style scoped>
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
.subscription-renewal--pending {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #b45309;
  font-weight: 600;
}

/* ── Où payer ──────────────────────────────────────────  */
.agencies-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 20px 22px;
  margin-top: 16px;
  box-shadow: 0 2px 14px rgba(4, 6, 119, 0.05);
}

.agencies-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.agencies-card-head i {
  color: var(--color-accent-dark);
}

.agencies-card-head h3 {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-heading);
  margin: 0;
}

.agencies-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.agencies-spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  animation: agenciesSpin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes agenciesSpin {
  to { transform: rotate(360deg); }
}

.agencies-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.84rem;
  color: var(--color-text-secondary);
}

.agencies-retry-btn {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
}

.agencies-retry-btn:hover {
  border-color: var(--color-primary);
}

.agencies-intro {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 0 0 10px;
}

.agencies-empty {
  font-size: 0.84rem;
  color: var(--color-text-secondary);
  font-style: italic;
  margin: 0;
}

.agency-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--color-border);
}

.agency-row:first-of-type {
  border-top: none;
}

.agency-row-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.agency-row-name {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-text);
}

.agency-row-address {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.agency-row-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.agency-row-distance {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-accent-dark);
}

.agency-row-phone {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.15s;
}

.agency-row-phone:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

/* ── Accès rapide ──────────────────────────────────────  */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.quick-tile {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow: 0 2px 14px rgba(4, 6, 119, 0.05);
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}

.quick-tile:hover {
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(4, 6, 119, 0.1);
}

.quick-tile-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.quick-tile-icon--indigo {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}

.quick-tile-icon--teal {
  background: rgba(13, 148, 136, 0.12);
  color: #0d9488;
}

.quick-tile-body {
  flex: 1;
  min-width: 0;
}

.quick-tile-body h3 {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--color-heading);
  margin: 0 0 2px;
}

.quick-tile-body p {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.quick-tile-arrow {
  color: #d1d5db;
  flex-shrink: 0;
}

.usage-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--color-hover-bg);
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}
</style>
