<template>
  <div class="dashboard">
    <header class="dash-header">
      <div class="dash-brand">
        <img src="/img/logo_1024.png" alt="BARAMAKI" class="dash-brand-logo" />
        <span class="dash-brand-name">BARAMAKI <span class="dash-brand-accent">Partenaires</span></span>
      </div>
      <router-link to="/tableau-de-bord" class="back-link">
        <i class="bi bi-arrow-left"></i> Tableau de bord
      </router-link>
    </header>

    <main class="plans-main">
      <h1 class="plans-title">Choisissez votre forfait</h1>
      <p class="plans-subtitle">Le prix affiché est figé au moment de la souscription — il ne change plus ensuite,
        même si une réduction en cours se termine ou que le tarif catalogue évolue.</p>

      <div class="period-pills">
        <button
          v-for="period in PERIODS"
          :key="period.value"
          type="button"
          class="period-pill"
          :class="{ 'period-pill--on': selectedPeriod === period.value }"
          @click="selectedPeriod = period.value"
        >
          {{ period.label }}
        </button>
      </div>

      <div class="currency-pills" title="Convertir l'affichage des prix — la souscription reste toujours en KMF">
        <button
          type="button"
          class="currency-pill"
          :class="{ 'currency-pill--on': displayCurrency === 'KMF' }"
          @click="displayCurrency = 'KMF'"
        >
          KMF
        </button>
        <button
          type="button"
          class="currency-pill"
          :class="{ 'currency-pill--on': displayCurrency === 'EUR' }"
          @click="displayCurrency = 'EUR'"
        >
          €
        </button>
      </div>

      <div v-if="loading" class="plans-loading">
        <div class="plans-spinner"></div>
        <p>Chargement des forfaits...</p>
      </div>

      <div v-else-if="!plans.length" class="plans-empty">
        <i class="bi bi-tags"></i>
        <p>Aucun forfait disponible pour l'instant.</p>
      </div>

      <div v-else class="plans-grid">
        <div v-for="p in plans" :key="p.uuid" class="plan-card" :class="{ 'plan-card--highlighted': p.isHighlighted }">
          <div v-if="priceFor(p)?.activePromotion" class="plan-promo-badge">
            {{ p.isHighlighted ? 'Offre spéciale' : '' }}
            <template v-if="p.isHighlighted"> · </template>
            {{ priceFor(p).activePromotion.discountPercent }} % de réduction
          </div>

          <h3 class="plan-name" :class="{ 'plan-name--badge-pad': priceFor(p)?.activePromotion }">
            <i v-if="p.isHighlighted" class="bi bi-stars"></i> {{ p.name }}
          </h3>
          <p v-if="p.description" class="plan-desc">{{ p.description }}</p>

          <template v-if="priceFor(p)">
            <div class="plan-price-block">
              <span v-if="priceFor(p).activePromotion" class="plan-price-old">
                {{ formatAmount(priceFor(p).amount) }}
              </span>
              <span class="plan-price-now">
                {{ formatAmount(priceFor(p).effectiveAmount) }}<span class="plan-price-unit">{{ periodSuffix }}</span>
              </span>
            </div>

            <button
              type="button"
              class="plan-btn"
              :class="{ 'plan-btn--filled': p.isHighlighted }"
              :disabled="isCurrentPlan(p) || !!subscribingUuid"
              @click="openConfirm(p)"
            >
              {{ isCurrentPlan(p) ? 'Abonnement actuel' : subscribingUuid === priceFor(p).uuid ? 'Souscription...' : 'Souscrire' }}
            </button>
          </template>
          <p v-else class="plan-no-price">Pas encore disponible pour cette période.</p>

          <ul v-if="p.features?.length" class="plan-features">
            <li v-for="(f, idx) in p.features" :key="idx" :class="{ 'plan-feature--excluded': !f.included }">
              <i class="bi" :class="f.included ? 'bi-check2' : 'bi-dash'"></i> {{ f.text }}
            </li>
          </ul>
        </div>
      </div>
    </main>

    <!-- Confirmation de souscription -->
    <div v-if="planToConfirm" class="modal-backdrop" @click.self="planToConfirm = null">
      <div class="modal-box">
        <h4 class="modal-title">Confirmer la souscription ?</h4>
        <p class="modal-text">
          Souscrire au forfait <strong>{{ planToConfirm.name }}</strong> pour
          <strong>{{ formatAmount(priceFor(planToConfirm).effectiveAmount) }}{{ periodSuffix }}</strong> ? Ce prix
          reste le vôtre jusqu'à votre prochain renouvellement.
        </p>
        <div v-if="subscribeError" class="plans-alert">{{ subscribeError }}</div>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" :disabled="!!subscribingUuid" @click="planToConfirm = null">Annuler</button>
          <button type="button" class="btn-primary" :disabled="!!subscribingUuid" @click="confirmSubscribe">
            {{ subscribingUuid ? 'Souscription...' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { listAvailablePlans, getMyClient, subscribeToPlan } from '@/services/geo/geoSelfServiceService'

const PERIODS = [
  { value: 'monthly', label: 'Mensuel' },
  { value: 'yearly', label: '12 mois' },
  { value: 'two_years', label: '24 mois' },
  { value: 'four_years', label: '48 mois' },
]

// Franc comorien : parité fixe avec l'euro (comme le franc CFA), pas un taux
// de change flottant — 1 EUR = 491,96775 KMF. Affichage seulement : la
// souscription est toujours enregistrée en KMF côté back, ce bouton ne fait
// que reconvertir ce qui est déjà là pour un client qui ne connaît pas
// encore le KMF — même taux que la saisie côté admin (GeoPlansPage.vue).
const KMF_PER_EUR = 491.96775

// Un forfait créé avant l'ajout de "included" a encore features comme un
// simple tableau de chaînes — normalisé à la lecture pour ne jamais
// l'afficher comme "non couvert" à tort.
function toFeatureObject(f) {
  if (typeof f === 'string') return { text: f, included: true }
  return { text: f?.text || '', included: f?.included !== false }
}

export default {
  name: 'ChoosePlanPage',
  data() {
    return {
      PERIODS,
      plans: [],
      loading: true,
      selectedPeriod: 'monthly',
      displayCurrency: 'KMF',
      myClient: null,
      planToConfirm: null,
      subscribingUuid: null,
      subscribeError: null,
    }
  },
  computed: {
    periodSuffix() {
      return { monthly: ' / mois', yearly: ' / 12 mois', two_years: ' / 24 mois', four_years: ' / 48 mois' }[this.selectedPeriod] || ''
    },
  },
  methods: {
    priceFor(plan) {
      return plan.prices.find((p) => p.billingPeriod === this.selectedPeriod) || null
    },
    formatAmount(amount) {
      if (this.displayCurrency === 'EUR') {
        return `${(Number(amount) / KMF_PER_EUR).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`
      }
      return `${Number(amount).toLocaleString('fr-FR')} KMF`
    },
    isCurrentPlan(plan) {
      const active = (this.myClient?.subscriptions || []).find((s) => s.status === 'active')
      return active?.planName === plan.name
    },
    async load() {
      this.loading = true
      try {
        const [plans, myClient] = await Promise.all([listAvailablePlans(), getMyClient().catch(() => null)])
        this.plans = plans.map((p) => ({ ...p, features: (p.features || []).map(toFeatureObject) }))
        this.myClient = myClient
      } finally {
        this.loading = false
      }
    },
    openConfirm(plan) {
      if (!this.priceFor(plan)) return
      this.subscribeError = null
      this.planToConfirm = plan
    },
    async confirmSubscribe() {
      const price = this.priceFor(this.planToConfirm)
      if (!price) return
      this.subscribingUuid = price.uuid
      this.subscribeError = null
      try {
        this.myClient = await subscribeToPlan(price.uuid)
        this.planToConfirm = null
        this.$router.push('/tableau-de-bord')
      } catch (err) {
        this.subscribeError = err.response?.data?.message || 'Erreur lors de la souscription.'
      } finally {
        this.subscribingUuid = null
      }
    },
  },
  mounted() {
    this.load()
  },
}
</script>

<style scoped>
.dashboard { min-height: 100vh; background: var(--color-bg); }

.dash-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; background: var(--color-surface); border-bottom: 1px solid var(--color-border);
}
.dash-brand { display: flex; align-items: center; gap: 10px; }
.dash-brand-logo { width: 32px; height: 32px; object-fit: contain; }
.dash-brand-name { font-family: var(--font-heading); font-weight: 800; font-size: 1rem; color: var(--color-primary); letter-spacing: 0.02em; }
.dash-brand-accent { color: var(--color-accent-dark); }

.back-link {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 999px; border: 1px solid var(--color-border);
  background: transparent; color: var(--color-text-secondary);
  font-family: var(--font-nav); font-size: 0.82rem; font-weight: 500;
  text-decoration: none; transition: border-color 0.15s, color 0.15s;
}
.back-link:hover { border-color: var(--color-primary); color: var(--color-primary); }

.plans-main { max-width: 1080px; margin: 0 auto; padding: 40px 24px 60px; }

.plans-title { font-family: var(--font-heading); font-weight: 800; font-size: 1.6rem; color: var(--color-primary); margin: 0 0 8px; text-align: center; }
.plans-subtitle { font-size: 0.85rem; color: var(--color-text-secondary); text-align: center; max-width: 560px; margin: 0 auto 24px; line-height: 1.6; }

.period-pills { display: flex; justify-content: center; gap: 8px; margin-bottom: 32px; }
.period-pill {
  padding: 8px 18px; border-radius: 999px; border: 1.5px solid var(--color-border);
  background: var(--color-surface); color: var(--color-text-secondary);
  font-family: var(--font-nav); font-size: 0.84rem; font-weight: 600; cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.period-pill--on { border-color: var(--color-primary); color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 8%, transparent); }

.currency-pills { display: flex; justify-content: center; gap: 6px; margin-bottom: 32px; }
.currency-pill {
  padding: 4px 14px; border-radius: 999px; border: 1.5px solid var(--color-border);
  background: transparent; color: var(--color-text-secondary);
  font-family: var(--font-nav); font-size: 0.76rem; font-weight: 600; cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.currency-pill--on { border-color: var(--color-accent); color: var(--color-accent-dark); background: color-mix(in srgb, var(--color-accent) 12%, transparent); }

.plans-loading, .plans-empty { text-align: center; padding: 60px 20px; color: var(--color-text-secondary); }
.plans-spinner {
  width: 28px; height: 28px; margin: 0 auto 12px; border-radius: 50%;
  border: 3px solid var(--color-border); border-top-color: var(--color-accent);
  animation: plansSpin 0.7s linear infinite;
}
@keyframes plansSpin { to { transform: rotate(360deg); } }
.plans-empty i { font-size: 1.8rem; display: block; margin-bottom: 8px; }

.plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; align-items: start; }

.plan-card {
  background: var(--color-surface); border: 1.5px solid var(--color-border); border-radius: 18px;
  padding: 30px 24px 26px; text-align: left; overflow: hidden; position: relative;
  box-shadow: 0 2px 14px rgba(4, 6, 119, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

/* Carte mise en avant : fond sombre volontairement fixe (comme
   ForbiddenPage.vue) — un "spotlight" qui reste identique quel que soit le
   thème clair/sombre du reste de la page, façon Hostinger. */
.plan-card--highlighted {
  background: linear-gradient(160deg, var(--color-primary) 0%, #1b0742 100%);
  border-color: transparent;
  color: #fff;
  transform: translateY(-10px);
  box-shadow: 0 20px 50px rgba(4, 6, 60, 0.35);
}

.plan-promo-badge {
  position: absolute; top: 16px; right: 16px;
  display: inline-flex; align-items: center; gap: 4px;
  background: color-mix(in srgb, var(--color-danger) 14%, transparent);
  color: var(--color-danger); font-size: 0.7rem; font-weight: 700;
  padding: 5px 12px; border-radius: 999px; text-align: center;
}
.plan-card--highlighted .plan-promo-badge {
  background: rgba(255, 255, 255, 0.16); color: #fff;
}

.plan-name {
  font-family: var(--font-heading); font-weight: 800; font-size: 1.15rem; color: var(--color-heading);
  margin: 0 0 8px; display: flex; align-items: center; gap: 6px;
}
.plan-name--badge-pad { padding-right: 60px; }
.plan-card--highlighted .plan-name { color: #fff; }
.plan-name i { color: var(--color-accent); }

.plan-desc {
  font-size: 0.82rem; color: var(--color-text-secondary); margin: 0 0 20px; line-height: 1.55;
}
.plan-card--highlighted .plan-desc { color: rgba(255, 255, 255, 0.7); }

.plan-price-block { margin-bottom: 18px; }
.plan-price-old { display: block; text-decoration: line-through; color: var(--color-text-muted); font-size: 0.9rem; }
.plan-card--highlighted .plan-price-old { color: rgba(255, 255, 255, 0.5); }
.plan-price-now { font-family: var(--font-heading); font-weight: 800; font-size: 2rem; color: var(--color-primary); }
.plan-card--highlighted .plan-price-now { color: #fff; }
.plan-price-unit { font-family: var(--font-nav); font-weight: 500; font-size: 0.85rem; color: var(--color-text-secondary); }
.plan-card--highlighted .plan-price-unit { color: rgba(255, 255, 255, 0.6); }

.plan-no-price { font-size: 0.82rem; color: var(--color-text-muted); font-style: italic; margin-bottom: 18px; }
.plan-card--highlighted .plan-no-price { color: rgba(255, 255, 255, 0.5); }

/* Forfait normal : bouton en contour, discret. Forfait mis en avant :
   bouton plein en vert accent, nettement plus expressif — c'est ce qui
   attire l'œil sur la carte recommandée, pas juste sa couleur de fond. */
.plan-btn {
  width: 100%; padding: 12px; border-radius: 10px;
  background: transparent; border: 1.5px solid var(--color-primary); color: var(--color-primary);
  font-family: var(--font-nav); font-weight: 700; font-size: 0.88rem; cursor: pointer;
  margin-bottom: 22px; transition: background 0.15s, opacity 0.15s, transform 0.15s;
}
.plan-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--color-primary) 8%, transparent); }
.plan-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.plan-btn--filled {
  background: var(--color-accent); border-color: var(--color-accent); color: #06281c;
  font-weight: 800;
  box-shadow: 0 10px 26px color-mix(in srgb, var(--color-accent) 45%, transparent);
}
.plan-btn--filled:hover:not(:disabled) {
  background: var(--color-accent-dark); border-color: var(--color-accent-dark); transform: translateY(-1px);
}

.plan-features { list-style: none; margin: 0; padding: 18px 0 0; border-top: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 10px; }
.plan-card--highlighted .plan-features { border-top-color: rgba(255, 255, 255, 0.15); }
.plan-features li { font-size: 0.82rem; color: var(--color-text); display: flex; align-items: flex-start; gap: 8px; }
.plan-card--highlighted .plan-features li { color: rgba(255, 255, 255, 0.85); }
.plan-features i { color: var(--color-accent-dark); margin-top: 2px; flex-shrink: 0; }
.plan-card--highlighted .plan-features i { color: var(--color-accent); }

/* Ligne NON couverte par ce forfait — grisée, tiret plutôt que coche,
   pour comparer plusieurs forfaits sur les mêmes points d'un coup d'œil. */
.plan-feature--excluded { color: var(--color-text-muted) !important; }
.plan-feature--excluded i { color: var(--color-text-muted) !important; }
.plan-card--highlighted .plan-feature--excluded { color: rgba(255, 255, 255, 0.35) !important; }
.plan-card--highlighted .plan-feature--excluded i { color: rgba(255, 255, 255, 0.35) !important; }

/* ── Modal de confirmation ────────────────────────────  */
.modal-backdrop {
  position: fixed; inset: 0; background: var(--color-backdrop);
  display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px;
}
.modal-box {
  background: var(--color-surface); border-radius: 16px; padding: 24px;
  max-width: 440px; width: 100%; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}
.modal-title { font-family: var(--font-heading); font-weight: 700; font-size: 1rem; color: var(--color-heading); margin: 0; }
.modal-text { margin: 12px 0 16px; font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.5; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }

.plans-alert { background: var(--color-danger-bg); color: var(--color-danger-dark); border-radius: 10px; padding: 10px 14px; font-size: 0.85rem; margin-bottom: 14px; }

.btn-primary, .btn-ghost {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 20px; border-radius: 8px;
  font-family: var(--font-nav); font-weight: 600; font-size: 0.85rem; cursor: pointer; border: 1px solid transparent;
}
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { background: transparent; border-color: var(--color-border); color: var(--color-text); }
.btn-ghost:hover:not(:disabled) { border-color: #cbd5e1; background: var(--color-hover-bg); }
</style>
