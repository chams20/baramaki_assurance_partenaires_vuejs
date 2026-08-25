<template>
  <div class="plans-page">
    <template v-if="!viewingPlan">
        <div v-if="pastSubscriptions.length" class="tabs-pills">
          <button type="button" class="tab-pill" :class="{ 'tab-pill--on': activeTab === 'available' }" @click="activeTab = 'available'">
            Forfaits disponibles
          </button>
          <button type="button" class="tab-pill" :class="{ 'tab-pill--on': activeTab === 'past' }" @click="activeTab = 'past'">
            Mes forfaits passés
          </button>
        </div>

      <template v-if="activeTab === 'past'">
        <h1 class="plans-title">Mes forfaits passés</h1>
        <p class="plans-subtitle">Historique de vos abonnements résiliés, expirés ou remplacés — dates,
          montants payés et durée d'utilisation réelle.</p>

        <div class="past-subs-list">
          <div v-for="s in pastSubscriptions" :key="s.uuid" class="past-sub-card">
            <div class="past-sub-head">
              <h3>{{ s.planName }}</h3>
              <span class="past-status-chip" :class="`past-status-chip--${s.status}`">{{ pastStatusLabel(s.status) }}</span>
            </div>
            <dl class="past-sub-grid">
              <div>
                <dt>Souscrit le</dt>
                <dd>{{ formatDate(s.startedAt) }}</dd>
              </div>
              <div>
                <dt>Payé le</dt>
                <dd>{{ formatDate(s.activatedAt) }}</dd>
              </div>
              <div>
                <dt>{{ s.status === 'upgraded' ? 'Remplacé le' : 'Résilié/expiré le' }}</dt>
                <dd>{{ formatDate(s.endedAt) }}</dd>
              </div>
              <div>
                <dt>Montant payé</dt>
                <dd>{{ Number(s.amountPaid).toLocaleString('fr-FR') }} KMF</dd>
              </div>
              <div>
                <dt>Jours utilisés</dt>
                <dd>{{ daysUsed(s) }}</dd>
              </div>
            </dl>
            <p v-if="s.status === 'cancelled' && s.activatedAt" class="past-sub-refund" :class="s.refundEligible ? 'past-sub-refund--ok' : 'past-sub-refund--no'">
              <i class="bi" :class="s.refundEligible ? 'bi-check-circle' : 'bi-info-circle'"></i>
              {{ s.refundEligible ? 'Résilié dans le délai — remboursement intégral.' : 'Résilié hors délai — aucun remboursement.' }}
            </p>
          </div>
        </div>
      </template>

      <template v-else>
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

            <!-- Le meilleur tarif possible, tout en bas de la carte — demande
                 explicite, pour que l'engagement long reste visible même si
                 la période sélectionnée en haut de page est "Mensuel". -->
            <p v-if="cheapestMonthlyEquivalent(p)" class="plan-from">
              À partir de <strong>{{ formatAmount(cheapestMonthlyEquivalent(p).monthlyEq) }}/mois</strong>
              équivalent sur {{ periodLabelLong(cheapestMonthlyEquivalent(p).period) }}
            </p>
          </div>
        </div>

        <button type="button" class="full-grid-btn" @click="showFullGridModal = true">
          <i class="bi bi-table"></i> Voir la grille tarifaire complète
        </button>
      </template>
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

            <div v-if="!isCurrentPlan(viewingPlan)" class="plan-terms">
              <details class="plan-terms-details">
                <summary>Conditions de souscription</summary>
                <ul>
                  <li>Le tarif affiché est figé au moment de la souscription — il ne change plus ensuite.</li>
                  <li>Vous pouvez résilier votre abonnement à tout moment depuis votre tableau de bord.</li>
                  <li>Si vous résiliez dans les <strong>20 jours</strong> suivant l'activation (votre premier paiement validé), vous êtes remboursé intégralement.</li>
                  <li>Passé ce délai de 20 jours, aucun remboursement n'est possible.</li>
                  <li>La résiliation révoque immédiatement les clés API financées par cet abonnement.</li>
                </ul>
              </details>
              <label class="plan-terms-check">
                <input type="checkbox" v-model="termsAccepted" />
                J'ai lu et j'accepte ces conditions.
              </label>
            </div>

            <div v-if="subscribeError" class="plans-alert">{{ subscribeError }}</div>

            <button
              type="button"
              class="plan-btn plan-btn--filled plan-detail-cta"
              :disabled="isCurrentPlan(viewingPlan) || !!subscribingUuid || !termsAccepted"
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

          <p v-if="cheapestMonthlyEquivalent(viewingPlan)" class="plan-from">
            À partir de <strong>{{ formatAmount(cheapestMonthlyEquivalent(viewingPlan).monthlyEq) }}/mois</strong>
            équivalent sur {{ periodLabelLong(cheapestMonthlyEquivalent(viewingPlan).period) }}
          </p>
        </div>
      </div>

      <!-- Grille tarifaire complète — demande explicite : "un bouton qui va
           ouvrir l'ensemble de la grille tarifaire". Respecte le même
           displayCurrency (KMF/€) que le reste de la page. -->
      <div v-if="showFullGridModal" class="modal-backdrop" @click.self="showFullGridModal = false">
        <div class="modal-box modal-box--wide">
          <div class="modal-head">
            <h4 class="modal-title"><i class="bi bi-table"></i> Grille tarifaire complète</h4>
            <button type="button" class="modal-close" @click="showFullGridModal = false"><i class="bi bi-x-lg"></i></button>
          </div>
          <p class="modal-text">
            Montant total pour toute la durée choisie, pas un prix mensuel à multiplier — la remise
            grandit avec l'engagement.
          </p>
          <div class="grid-table-scroll">
            <table class="grid-table">
              <thead>
                <tr>
                  <th>Durée</th>
                  <th v-for="p in plans" :key="p.uuid">{{ p.name }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="period in PERIODS" :key="period.value">
                  <th scope="row">{{ period.label }}</th>
                  <td v-for="p in plans" :key="p.uuid">
                    <template v-if="priceFor(p, period.value)">
                      <span class="grid-price-total">{{ formatAmount(priceFor(p, period.value).effectiveAmount) }}</span>
                      <span v-if="period.value !== 'monthly'" class="grid-price-monthly">
                        {{ formatAmount(Number(priceFor(p, period.value).effectiveAmount) / periodMonthsFor(period.value)) }}/mois éq.
                      </span>
                    </template>
                    <span v-else class="grid-price-none">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="showFullGridModal = false">Fermer</button>
          </div>
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

// Pour calculer "à partir de X/mois équivalent sur Y" — le nombre de mois
// que couvre chaque durée, jamais une approximation (les mois n'ont pas
// tous 30 jours, mais ici c'est juste ce dénominateur qui compte).
const PERIOD_MONTHS = { monthly: 1, yearly: 12, two_years: 24, four_years: 48 }
const PERIOD_LABELS_LONG = { monthly: '1 mois', yearly: '12 mois', two_years: '24 mois', four_years: '48 mois' }

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
      // Gate contractuelle — demande explicite : "un genre de contrat où il
      // lit et il accepte" avant que la souscription ne parte (doc 15).
      // Réinitialisé à chaque ouverture d'offre pour ne jamais présélectionner
      // l'acceptation d'un contrat qui n'a pas été relu pour CE forfait.
      termsAccepted: false,
      // Grille tarifaire complète (4 durées × tous les forfaits) — demande
      // explicite, en plus des cartes déjà là.
      showFullGridModal: false,
      // Onglet "Mes forfaits passés" — demande explicite : garder l'accès à
      // l'historique (dates, montant payé, jours utilisés) même après une
      // résiliation, quand le partenaire perd la vue "abonnement en cours"
      // du tableau de bord (doc 15).
      activeTab: 'available',
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
    // Tout ce qui n'est plus "en cours" — résilié, expiré, remplacé par un
    // upgrade, ou jamais activé faute de paiement. Trié du plus récent au
    // plus ancien (même tri que les autres listes de cette page).
    pastSubscriptions() {
      return (this.myClient?.subscriptions || [])
        .filter((s) => !['active', 'pending'].includes(s.status))
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    },
  },
  methods: {
    formatDate(iso) {
      if (!iso) return '—'
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
    },
    pastStatusLabel(status) {
      return {
        cancelled: 'Résilié',
        expired: 'Expiré',
        upgraded: 'Remplacé (changement de forfait)',
        never_activated: 'Jamais activé',
      }[status] || status
    },
    // Consommation réelle entre le premier paiement et la fin d'accès — null
    // (affiché "—") tant que l'une des deux dates manque, notamment pour
    // tout l'historique antérieur à cette fonctionnalité (voir migration
    // Version20260825140000, ended_at jamais reconstitué rétroactivement).
    daysUsed(subscription) {
      if (!subscription.activatedAt || !subscription.endedAt) return '—'
      const days = Math.round((new Date(subscription.endedAt) - new Date(subscription.activatedAt)) / 86400000)
      return `${days} jour${days > 1 ? 's' : ''}`
    },
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
    periodLabelLong(period) {
      return PERIOD_LABELS_LONG[period] || ''
    },
    periodMonthsFor(period) {
      return PERIOD_MONTHS[period] || 1
    },
    // Le meilleur tarif mensuel équivalent, toutes durées confondues — quasi
    // toujours 48 mois (le plus dégressif), mais calculé plutôt que supposé
    // au cas où un forfait n'a pas encore de prix sur cette durée.
    cheapestMonthlyEquivalent(plan) {
      let best = null
      for (const price of plan.prices) {
        const months = PERIOD_MONTHS[price.billingPeriod]
        if (!months) continue
        const monthlyEq = Number(price.effectiveAmount) / months
        if (!best || monthlyEq < best.monthlyEq) best = { monthlyEq, period: price.billingPeriod }
      }
      return best
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
      this.termsAccepted = false
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

.tabs-pills { display: flex; justify-content: center; gap: 8px; margin-bottom: 28px; }
.tab-pill {
  padding: 9px 20px; border-radius: 999px; border: 1.5px solid var(--color-border);
  background: var(--color-surface); color: var(--color-text-secondary);
  font-family: var(--font-nav); font-size: 0.84rem; font-weight: 700; cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.tab-pill--on { border-color: var(--color-primary); color: #fff; background: var(--color-primary); }

.past-subs-list { display: flex; flex-direction: column; gap: 14px; max-width: 680px; margin: 0 auto; }
.past-sub-card {
  background: var(--color-surface); border: 1.5px solid var(--color-border); border-radius: 14px;
  padding: 18px 22px;
}
.past-sub-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.past-sub-head h3 { font-family: var(--font-heading); font-weight: 800; font-size: 1rem; color: var(--color-heading); margin: 0; }

.past-status-chip {
  display: inline-flex; align-items: center; padding: 5px 12px; border-radius: 999px;
  font-size: 0.72rem; font-weight: 700; flex-shrink: 0; white-space: nowrap;
  background: var(--color-hover-bg); color: var(--color-text-secondary);
}
.past-status-chip--cancelled { background: color-mix(in srgb, var(--color-danger) 14%, transparent); color: var(--color-danger-dark); }
.past-status-chip--expired { background: color-mix(in srgb, var(--color-text-muted) 18%, transparent); color: var(--color-text-secondary); }
.past-status-chip--upgraded { background: color-mix(in srgb, var(--color-accent) 15%, transparent); color: var(--color-accent-dark); }

.past-sub-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin: 0; }
.past-sub-grid dt { font-size: 0.72rem; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 3px; }
.past-sub-grid dd { font-size: 0.88rem; color: var(--color-text); font-weight: 700; margin: 0; }

.past-sub-refund {
  display: flex; align-items: center; gap: 8px; margin: 14px 0 0; padding-top: 14px;
  border-top: 1px dashed var(--color-border); font-size: 0.8rem; line-height: 1.5;
}
.past-sub-refund--ok { color: var(--color-accent-dark); }
.past-sub-refund--no { color: var(--color-text-secondary); }

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

.plan-terms { margin-bottom: 18px; }
.plan-terms-details {
  font-size: 0.78rem; color: var(--color-text-secondary); line-height: 1.6;
  border: 1px solid var(--color-border); border-radius: 10px; padding: 10px 14px; margin-bottom: 10px;
}
.plan-card--highlighted .plan-terms-details { border-color: rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.75); }
.plan-terms-details summary { cursor: pointer; font-weight: 700; color: var(--color-text); }
.plan-card--highlighted .plan-terms-details summary { color: #fff; }
.plan-terms-details ul { margin: 10px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
.plan-terms-check {
  display: flex; align-items: flex-start; gap: 8px; cursor: pointer;
  font-size: 0.82rem; color: var(--color-text); line-height: 1.5;
}
.plan-card--highlighted .plan-terms-check { color: rgba(255, 255, 255, 0.85); }
.plan-terms-check input { margin-top: 3px; flex-shrink: 0; cursor: pointer; }

.plan-detail-cta { margin-bottom: 0; }

.plan-detail-features { padding-top: 24px; margin-top: 24px; }

/* ── "À partir de X/mois équivalent sur..." — tout en bas de la carte ──  */
.plan-from {
  margin: 14px 0 0;
  padding-top: 14px;
  border-top: 1px dashed var(--color-border);
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}
.plan-from strong { color: var(--color-accent-dark); font-weight: 800; }
.plan-card--highlighted .plan-from { border-top-color: rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.65); }
.plan-card--highlighted .plan-from strong { color: var(--color-accent); }

/* ── Bouton grille tarifaire complète ──  */
.full-grid-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin: 28px auto 0; padding: 10px 22px;
  background: none; border: 1.5px solid var(--color-border); border-radius: 999px;
  color: var(--color-text-secondary); font-family: var(--font-nav); font-weight: 600; font-size: 0.84rem;
  cursor: pointer; transition: border-color 0.15s, color 0.15s;
}
.full-grid-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

/* ── Modale grille tarifaire ──  */
.modal-backdrop {
  position: fixed; inset: 0; background: var(--color-backdrop);
  display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px;
}
.modal-box { background: var(--color-surface); border-radius: 16px; padding: 24px; max-width: 440px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2); }
.modal-box--wide { max-width: 720px; }
.modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 10px; }
.modal-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-heading); font-weight: 700; font-size: 1rem; color: var(--color-heading); margin: 0; }
.modal-close { background: none; border: none; color: var(--color-text-secondary); cursor: pointer; font-size: 1rem; flex-shrink: 0; }
.modal-text { margin: 0 0 16px; font-size: 0.83rem; color: var(--color-text-secondary); line-height: 1.55; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

.btn-ghost {
  background: none; border: 1.5px solid var(--color-border); border-radius: 8px;
  padding: 8px 16px; font-family: var(--font-nav); font-weight: 600; font-size: 0.82rem;
  color: var(--color-text-secondary); cursor: pointer; transition: border-color 0.15s, color 0.15s;
}
.btn-ghost:hover { border-color: var(--color-primary); color: var(--color-primary); }

.grid-table-scroll { overflow-x: auto; }
.grid-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 480px; }
.grid-table th, .grid-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--color-border); vertical-align: top; }
.grid-table thead th { font-family: var(--font-heading); font-weight: 700; font-size: 0.78rem; color: var(--color-primary); background: var(--color-hover-bg); white-space: nowrap; }
.grid-table tbody th { font-weight: 700; color: var(--color-heading); white-space: nowrap; }
.grid-table tbody tr:last-child th, .grid-table tbody tr:last-child td { border-bottom: none; }
.grid-price-total { display: block; font-weight: 700; color: var(--color-heading); }
.grid-price-monthly { display: block; font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 1px; }
.grid-price-none { color: var(--color-text-muted); font-style: italic; }
</style>
