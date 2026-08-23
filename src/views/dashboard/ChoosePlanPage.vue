<template>
  <div class="plans-page">
    <template v-if="!viewingPlan">
        <h1 class="plans-title">Choisissez votre forfait</h1>
        <p class="plans-subtitle">Le prix affiché est figé au moment de la souscription — il ne change plus
          ensuite, même si une réduction en cours se termine ou que le tarif catalogue évolue.</p>

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
            <div v-if="priceFor(p, selectedPeriod)?.activePromotion" class="plan-promo-badge">
              {{ p.isHighlighted ? 'Offre spéciale' : '' }}
              <template v-if="p.isHighlighted"> · </template>
              {{ priceFor(p, selectedPeriod).activePromotion.discountPercent }} % de réduction
            </div>

            <h3 class="plan-name" :class="{ 'plan-name--badge-pad': priceFor(p, selectedPeriod)?.activePromotion }">
              <i v-if="p.isHighlighted" class="bi bi-stars"></i> {{ p.name }}
            </h3>
            <p v-if="p.description" class="plan-desc">{{ p.description }}</p>

            <div v-if="priceFor(p, selectedPeriod)" class="plan-price-block">
              <span v-if="priceFor(p, selectedPeriod).activePromotion" class="plan-price-old">
                {{ formatAmount(priceFor(p, selectedPeriod).amount) }}
              </span>
              <span class="plan-price-now">
                {{ formatAmount(priceFor(p, selectedPeriod).effectiveAmount) }}<span class="plan-price-unit">{{ periodSuffixFor(selectedPeriod) }}</span>
              </span>
            </div>
            <p v-else class="plan-no-price">Pas encore disponible pour cette période — voir l'offre pour les
              autres durées.</p>

            <button
              v-if="!currentSubscription || isCurrentPlan(p) || isEligibleUpgrade(p)"
              type="button"
              class="plan-btn"
              :class="{ 'plan-btn--filled': p.isHighlighted }"
              :disabled="isCurrentPlan(p)"
              @click="openPlanDetail(p)"
            >
              {{ isCurrentPlan(p) ? 'Abonnement actuel' : 'Voir l\'offre' }}
            </button>
            <p v-else-if="currentSubscription?.status === 'pending'" class="plan-no-price">
              Terminez d'abord le paiement de votre abonnement en cours.
            </p>
            <p v-else class="plan-no-price">Forfait inférieur à votre abonnement actuel.</p>

            <ul class="plan-features">
              <li class="plan-feature--quota"><i class="bi bi-speedometer2"></i> {{ quotaLabel(p.monthlyRequestQuota) }}</li>
              <li v-for="(f, idx) in p.features" :key="idx" :class="{ 'plan-feature--excluded': !f.included }">
                <i class="bi" :class="f.included ? 'bi-check2' : 'bi-dash'"></i> {{ f.text }}
              </li>
            </ul>
          </div>
        </div>
      </template>

      <!-- Vue dédiée à une offre — choix réel de la période + confirmation,
           façon page produit Hostinger plutôt qu'un simple modal. -->
      <div v-else class="plan-detail">
        <button type="button" class="plan-detail-back" @click="closePlanDetail">
          <i class="bi bi-arrow-left"></i> Retour aux forfaits
        </button>

        <div class="plan-card plan-detail-card" :class="{ 'plan-card--highlighted': viewingPlan.isHighlighted }">
          <div v-if="viewingPlan.isHighlighted" class="plan-detail-banner">
            <i class="bi bi-star-fill"></i> {{ viewingPlan.highlightLabel || 'Mis en avant' }}
          </div>

          <h2 class="plan-detail-name">{{ viewingPlan.name }}</h2>
          <p v-if="viewingPlan.description" class="plan-desc plan-detail-desc">{{ viewingPlan.description }}</p>

          <div class="period-pills">
            <button
              v-for="period in PERIODS"
              :key="period.value"
              type="button"
              class="period-pill"
              :class="{ 'period-pill--on': detailPeriod === period.value }"
              @click="detailPeriod = period.value"
            >
              {{ period.label }}
            </button>
          </div>

          <template v-if="priceFor(viewingPlan, detailPeriod)">
            <div class="plan-price-block plan-detail-price-block">
              <span v-if="priceFor(viewingPlan, detailPeriod).activePromotion" class="plan-price-old">
                {{ formatAmount(priceFor(viewingPlan, detailPeriod).amount) }}
              </span>
              <span class="plan-price-now">
                {{ formatAmount(priceFor(viewingPlan, detailPeriod).effectiveAmount) }}<span class="plan-price-unit">{{ periodSuffixFor(detailPeriod) }}</span>
              </span>
              <span v-if="priceFor(viewingPlan, detailPeriod).activePromotion" class="plan-detail-promo">
                -{{ priceFor(viewingPlan, detailPeriod).activePromotion.discountPercent }} %
              </span>
            </div>

            <p v-if="currentSubscription" class="plan-detail-hint">
              Le temps restant sur votre abonnement actuel sera déduit du montant à régler — le montant exact
              vous sera confirmé une fois validé.
            </p>
            <p v-else class="plan-detail-hint">
              Ce prix reste le vôtre jusqu'à votre prochain renouvellement, même si une réduction en cours se
              termine ou que le tarif catalogue évolue.
            </p>

            <div v-if="subscribeError" class="plans-alert">{{ subscribeError }}</div>

            <button
              type="button"
              class="plan-btn plan-btn--filled plan-detail-cta"
              :disabled="isCurrentPlan(viewingPlan) || !!subscribingUuid"
              @click="confirmSubscribe(viewingPlan)"
            >
              {{ ctaLabel(viewingPlan) }}
            </button>
          </template>
          <p v-else class="plan-no-price">Pas encore disponible pour cette période.</p>

          <ul class="plan-features plan-detail-features">
            <li class="plan-feature--quota"><i class="bi bi-speedometer2"></i> {{ quotaLabel(viewingPlan.monthlyRequestQuota) }}</li>
            <li v-for="(f, idx) in viewingPlan.features" :key="idx" :class="{ 'plan-feature--excluded': !f.included }">
              <i class="bi" :class="f.included ? 'bi-check2' : 'bi-dash'"></i> {{ f.text }}
            </li>
          </ul>
        </div>
      </div>
  </div>
</template>

<script>
import { useToast } from 'vue-toastification'
import { listAvailablePlans, getMyClient, subscribeToPlan, upgradeSubscription } from '@/services/geo/geoSelfServiceService'

const PERIODS = [
  { value: 'monthly', label: 'Mensuel' },
  { value: 'yearly', label: '12 mois' },
  { value: 'two_years', label: '24 mois' },
  { value: 'four_years', label: '48 mois' },
]

// Période affichée par défaut sur la carte de la grille — "12 mois" comme
// ancrage (engagement plus long, tarif dégressif typique), pas forcément le
// premier prix existant. Repli sur le premier prix trouvé si ce forfait n'a
// pas de prix 12 mois.
const DEFAULT_PERIOD_PRIORITY = ['yearly', 'monthly', 'two_years', 'four_years']

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
      toast: useToast(),
      PERIODS,
      plans: [],
      loading: true,
      // Sélecteur global — juste un aperçu du prix sur toute la grille,
      // demande explicite : "on a une idée avant d'y aller". Indépendant du
      // choix fait dans la vue détaillée d'une offre (detailPeriod).
      selectedPeriod: 'monthly',
      displayCurrency: 'KMF',
      myClient: null,
      // Forfait actuellement ouvert en vue détaillée (remplace la grille) —
      // demande explicite : plus un simple modal, une vraie page produit par
      // offre où la période se choisit pour de vrai, façon Hostinger.
      viewingPlan: null,
      detailPeriod: 'yearly',
      subscribingUuid: null,
      subscribeError: null,
    }
  },
  computed: {
    // "En cours" au sens large (`active` ou `pending`) — voir
    // GeoApiSubscription::STATUS_PENDING. Empêche une double souscription au
    // même forfait pendant que le tout premier paiement est en attente ;
    // seul un abonnement VRAIMENT `active` autorise un upgrade (le back
    // l'exige, voir GeoApiPartnerSelfServiceController::findActiveSubscription()).
    currentSubscription() {
      return (this.myClient?.subscriptions || []).find((s) => s.status === 'active' || s.status === 'pending') || null
    },
  },
  methods: {
    priceFor(plan, period) {
      return plan.prices.find((p) => p.billingPeriod === period) || null
    },
    // Période "12 mois" mise en avant sur la carte de la grille par défaut —
    // repli sur le premier prix existant si ce forfait n'a pas de prix 12 mois.
    defaultPeriodFor(plan) {
      const found = DEFAULT_PERIOD_PRIORITY.find((period) => this.priceFor(plan, period))
      return found || PERIODS[0].value
    },
    periodSuffixFor(period) {
      return { monthly: ' / mois', yearly: ' / 12 mois', two_years: ' / 24 mois', four_years: ' / 48 mois' }[period] || ''
    },
    // Upgrade seulement (doc 12 §3) : sort_order sert déjà à classer les
    // forfaits par gamme côté admin, réutilisé ici plutôt qu'un second champ.
    // `status === 'active'` explicite : le back n'autorise l'upgrade que
    // depuis un abonnement VRAIMENT actif, jamais depuis un `pending` en
    // attente de son premier paiement (findActiveSubscription() côté back).
    isEligibleUpgrade(plan) {
      return this.currentSubscription?.status === 'active' && plan.sortOrder > this.currentSubscription.planSortOrder
    },
    formatAmount(amount) {
      if (this.displayCurrency === 'EUR') {
        return `${(Number(amount) / KMF_PER_EUR).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`
      }
      return `${Number(amount).toLocaleString('fr-FR')} KMF`
    },
    // Le chiffre est stocké brut (200000) — jamais déjà formaté en base.
    // null = illimité (même convention que doc 12 §2).
    quotaLabel(quota) {
      if (quota === null || quota === undefined) return 'Requêtes illimitées'
      return `${Number(quota).toLocaleString('fr-FR')} requêtes / mois`
    },
    isCurrentPlan(plan) {
      return this.currentSubscription?.planName === plan.name
    },
    ctaLabel(plan) {
      if (this.isCurrentPlan(plan)) return this.currentSubscription?.status === 'pending' ? 'Paiement en attente' : 'Abonnement actuel'
      if (this.subscribingUuid) return this.currentSubscription ? 'Changement...' : 'Souscription...'
      return this.currentSubscription ? 'Passer à ce forfait' : 'Souscrire'
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
    openPlanDetail(plan) {
      this.viewingPlan = plan
      this.detailPeriod = this.priceFor(plan, this.selectedPeriod) ? this.selectedPeriod : this.defaultPeriodFor(plan)
      this.subscribeError = null
    },
    closePlanDetail() {
      this.viewingPlan = null
    },
    async confirmSubscribe(plan) {
      const price = this.priceFor(plan, this.detailPeriod)
      if (!price) return
      const isUpgrade = this.currentSubscription?.status === 'active'
      this.subscribingUuid = price.uuid
      this.subscribeError = null
      try {
        this.myClient = isUpgrade ? await upgradeSubscription(price.uuid) : await subscribeToPlan(price.uuid)
        if (isUpgrade) {
          // Le montant réellement dû (après crédit prorata) n'est connu
          // qu'une fois le back passé — c'est la facture la plus récente.
          const latestInvoice = (this.myClient.invoices || [])[0]
          this.toast.success(
            latestInvoice
              ? `Forfait changé — ${this.formatAmount(latestInvoice.amount)} à régler pour cette transaction.`
              : 'Forfait changé.',
          )
        }
        this.$router.push('/tableau-de-bord')
      } catch (err) {
        this.subscribeError = err.response?.data?.message || (isUpgrade ? 'Erreur lors du changement de forfait.' : 'Erreur lors de la souscription.')
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

.plan-feature--quota { font-weight: 700 !important; }

.plans-alert { background: var(--color-danger-bg); color: var(--color-danger-dark); border-radius: 10px; padding: 10px 14px; font-size: 0.85rem; margin-bottom: 14px; }

/* ── Vue dédiée à une offre (remplace la grille) ──────  */
.plan-detail { max-width: 560px; margin: 0 auto; }

.plan-detail-back {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: none; cursor: pointer;
  font-family: var(--font-nav); font-size: 0.84rem; font-weight: 600; color: var(--color-text-secondary);
  margin-bottom: 20px; padding: 0; transition: color 0.15s;
}
.plan-detail-back:hover { color: var(--color-primary); }

.plan-detail-card {
  /* Reprend .plan-card / .plan-card--highlighted tel quel — même langage
     visuel que la grille, juste une carte plus grande et seule. */
  padding: 36px 32px 32px;
  transform: none !important;
}

.plan-detail-banner {
  display: inline-flex; align-items: center; gap: 6px;
  background: color-mix(in srgb, var(--color-accent) 16%, transparent);
  color: var(--color-accent-dark); font-size: 0.74rem; font-weight: 700;
  padding: 5px 14px; border-radius: 999px; margin-bottom: 14px;
}
.plan-card--highlighted .plan-detail-banner { background: rgba(255, 255, 255, 0.16); color: #fff; }

.plan-detail-name {
  font-family: var(--font-heading); font-weight: 800; font-size: 1.5rem; color: var(--color-heading);
  margin: 0 0 8px;
}
.plan-card--highlighted .plan-detail-name { color: #fff; }

.plan-detail-desc { font-size: 0.9rem; margin-bottom: 24px; }

.plan-detail-card .period-pills { justify-content: flex-start; margin-bottom: 20px; }
.plan-card--highlighted .period-pill {
  border-color: rgba(255, 255, 255, 0.25); background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.65);
}
.plan-card--highlighted .period-pill--on {
  border-color: var(--color-accent); background: var(--color-accent); color: #06281c;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--color-accent) 45%, transparent);
}

.plan-detail-price-block { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.plan-detail-price-block .plan-price-old { display: inline; }

.plan-detail-promo {
  display: inline-flex; align-items: center;
  background: color-mix(in srgb, var(--color-danger) 14%, transparent); color: var(--color-danger);
  font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 999px;
}
.plan-card--highlighted .plan-detail-promo { background: rgba(255, 255, 255, 0.16); color: #fff; }

.plan-detail-hint { font-size: 0.78rem; color: var(--color-text-secondary); line-height: 1.5; margin: 0 0 18px; }
.plan-card--highlighted .plan-detail-hint { color: rgba(255, 255, 255, 0.6); }

.plan-detail-cta { margin-bottom: 0; }

.plan-detail-features { padding-top: 24px; margin-top: 24px; }
</style>
