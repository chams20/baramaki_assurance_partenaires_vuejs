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
      <div v-if="currentSubscription" class="dash-grid">
        <!-- Forfait — statut/prix en tête, échéance mise en scène par
             l'anneau plutôt qu'une simple ligne de texte (demande explicite,
             inspirée du tableau de bord Hostinger). -->
        <section class="panel-card panel-card--plan">
          <div class="panel-card-head">
            <div class="panel-card-head-left">
              <div class="plan-icon"><i class="bi bi-bookmark-check-fill"></i></div>
              <div>
                <h2 class="plan-title">{{ currentSubscription.planName }}</h2>
                <p class="plan-price">
                  {{ Number(currentSubscription.amountPaid).toLocaleString('fr-FR') }} KMF
                  <span>{{ periodLabel(currentSubscription.billingPeriod) }}</span>
                </p>
                <p class="plan-price-eur">≈ {{ eurEquivalent(currentSubscription.amountPaid) }}</p>
              </div>
            </div>
            <span class="status-chip" :class="`status-chip--${currentSubscription.status}`">
              <i class="bi" :class="currentSubscription.status === 'pending' ? 'bi-hourglass-split' : 'bi-check-circle-fill'"></i>
              {{ currentSubscription.status === 'pending' ? 'En attente' : 'Actif' }}
            </span>
          </div>

          <div class="subscription-deadline">
            <div class="renewal-ring">
              <div ref="ringChart" class="renewal-ring-chart"></div>
              <span class="renewal-ring-days" :style="{ fontSize: ringDaysFontSize }">{{ ringDaysRemaining }}<small>j</small></span>
            </div>
            <div class="subscription-deadline-text">
              <span class="subscription-deadline-label">
                <i class="bi" :class="currentSubscription.status === 'pending' ? 'bi-hourglass-split' : 'bi-arrow-repeat'"></i>
                {{ currentSubscription.status === 'pending' ? 'À régler avant le' : 'Renouvellement le' }}
              </span>
              <span class="subscription-deadline-date">{{ formatDate(ringDeadline) }}</span>
            </div>
          </div>

          <div class="subscription-actions">
            <router-link v-if="currentSubscription.status === 'active'" to="/forfaits" class="subscription-link subscription-link--filled">
              <i class="bi bi-arrow-up-circle"></i> Passer à un forfait supérieur
            </router-link>
            <router-link to="/forfaits" class="subscription-link subscription-link--ghost">Voir tous les forfaits</router-link>
          </div>
        </section>

        <!-- Consommation — chiffres réels depuis le 2026-08-24
             (geo_api_requests, alimentée par PartnerApiKeyAuthenticator/
             PartnerApiQuotaSubscriber à chaque appel externe authentifié par
             clé, voir docs/refonte-backend/09-api-adressage-partenaires.md
             §5). Le graphique n'affiche jamais rien d'inventé : tant qu'aucun
             appel réel n'a eu lieu, les barres sont honnêtement à zéro. -->
        <section class="panel-card panel-card--usage">
          <div class="panel-card-head">
            <h3 class="panel-card-title"><i class="bi bi-graph-up"></i> Consommation</h3>
          </div>

          <div class="usage-quota">
            <span class="usage-quota-value">{{ usageSummaryLabel }}</span>
            <span class="usage-quota-caption">{{ periodRangeLabel }}</span>
          </div>

          <div ref="usageChart" class="usage-chart"></div>
          <p v-if="!totalDailyUsage" class="usage-note">
            <i class="bi bi-info-circle"></i> Aucune requête enregistrée sur les 10 derniers jours — les
            appels de vos clés apparaîtront ici.
          </p>
        </section>
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

      <!-- Accès rapide — en liste plutôt qu'en grille de 2 tuiles, pour une
           lecture plus dense (demande explicite : "trop minimaliste"). Le
           détail (liste complète des clés, historique des factures) vit sur
           ses propres pages, pas ici. -->
      <section class="quick-list">
        <router-link to="/cles-api" class="quick-row">
          <div class="quick-row-icon quick-row-icon--indigo"><i class="bi bi-key"></i></div>
          <div class="quick-row-body">
            <h3>Clés API</h3>
            <p>{{ keysSummary }}</p>
          </div>
          <i class="bi bi-chevron-right quick-row-arrow"></i>
        </router-link>

        <router-link to="/facturation" class="quick-row">
          <div class="quick-row-icon quick-row-icon--teal"><i class="bi bi-receipt"></i></div>
          <div class="quick-row-body">
            <h3>Facturation</h3>
            <p>{{ billingSummary }}</p>
          </div>
          <i class="bi bi-chevron-right quick-row-arrow"></i>
        </router-link>

        <router-link to="/forfaits" class="quick-row">
          <div class="quick-row-icon quick-row-icon--amber"><i class="bi bi-tags"></i></div>
          <div class="quick-row-body">
            <h3>Forfaits</h3>
            <p>Comparer ou changer de forfait</p>
          </div>
          <i class="bi bi-chevron-right quick-row-arrow"></i>
        </router-link>

        <router-link to="/mon-entreprise" class="quick-row">
          <div class="quick-row-icon quick-row-icon--violet"><i class="bi bi-building"></i></div>
          <div class="quick-row-body">
            <h3>Mon entreprise</h3>
            <p>Logo, coordonnées, documents</p>
          </div>
          <i class="bi bi-chevron-right quick-row-arrow"></i>
        </router-link>
      </section>
    </template>
  </div>
</template>

<script>
import authStore from '@/services/auth/authStore'
import { getMyClient, getNearbyAgenciesForMe } from '@/services/geo/geoSelfServiceService'

// ECharts en tree-shaking (voir front/baramaki_assurance_admin_vuejs/docs/
// recette-dashboard.md §3) — seul le nécessaire (barres + donut) est
// importé, pas la lib complète (~1 Mo gzippé sinon).
import { use, init as echartsInit, getInstanceByDom as echartsGetInstance } from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([BarChart, PieChart, TooltipComponent, GridComponent, CanvasRenderer])

// Fenêtre "pleine" de l'anneau de renouvellement — sert juste à calculer la
// fraction restante affichée (donut ECharts, voir drawRingChart()), pas une
// durée exacte de facturation (les mois n'ont pas tous 30 jours) : purement
// visuel.
const PERIOD_WINDOW_DAYS = { monthly: 30, yearly: 365, two_years: 730, four_years: 1460 }

// Franc comorien (KMF) : parité FIXE avec l'euro, jamais un taux de marché
// flottant à aller chercher quelque part — héritée de l'ancienne parité
// FRF/KMF (75 KMF = 1 FRF), reportée telle quelle sur l'euro à son lancement
// (6,55957 FRF = 1 €) : 75 × 6,55957 = 491,9677 KMF pour 1 € pile. Une vraie
// conversion officielle, pas une estimation — voir docs/refonte-backend/
// 12-forfaits-partenaires.md.
const KMF_PER_EUR = 491.9677

// Lit un token de couleur posé sur :root (design-tokens.css) — ECharts
// dessine sur un <canvas>, il ne peut pas résoudre var(--x) tout seul comme
// le ferait le DOM/SVG.
function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export default {
  name: 'DashboardPage',
  data() {
    return {
      loading: true,
      myClient: null,
      nearbyAgencies: [],
      loadingNearbyAgencies: false,
      nearbyAgenciesError: null,
      chartResizeObserver: null,
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
    // Consommation réelle (geo_api_requests) vs quota du forfait — les deux
    // chiffres viennent du back, voir GeoApiPartnerSelfServiceController::
    // serializeMyClient() (requestsThisMonth/planMonthlyRequestQuota).
    usageSummaryLabel() {
      const used = Number(this.currentSubscription?.requestsThisMonth || 0).toLocaleString('fr-FR')
      const quota = this.currentSubscription?.planMonthlyRequestQuota
      return quota === null || quota === undefined
        ? `${used} requête${this.currentSubscription?.requestsThisMonth > 1 ? 's' : ''} · illimité`
        : `${used} / ${Number(quota).toLocaleString('fr-FR')} requêtes`
    },
    // Série dense (un point par jour, zéro rempli) déjà calculée côté back
    // — voir GeoApiPartnerSelfServiceController::buildDailyRequestSeries().
    dailyUsageSeries() {
      return this.currentSubscription?.requestsLast10Days || []
    },
    totalDailyUsage() {
      return this.dailyUsageSeries.reduce((sum, d) => sum + d.count, 0)
    },
    // "de quand à quand" — demande explicite (le mois d'un partenaire n'est
    // pas le mois calendaire, il est ancré sur son propre jour de
    // renouvellement, voir GeoApiSubscription::getCurrentMonthlyPeriodStart()
    // côté back). Repli sur "ce mois-ci" seulement pour un abonnement
    // `pending` (pas encore de fenêtre réelle avant le premier paiement).
    periodRangeLabel() {
      const start = this.currentSubscription?.currentPeriodStart
      const end = this.currentSubscription?.currentPeriodEnd
      if (!start || !end) return 'ce mois-ci'
      const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
      return `du ${fmt.format(new Date(start))} au ${fmt.format(new Date(end))}`
    },
    // ── Anneau de renouvellement/échéance — visuel uniquement (voir
    //    docs/refonte-backend/12-forfaits-partenaires.md). `pending` : le
    //    délai de grâce (2 jours) court depuis `startedAt`, qui vaut aussi
    //    la date de création de la facture — même repli que côté email
    //    (voir GeoApiPartnerSelfServiceController::subscribe()), pas de
    //    champ dueAt exposé directement sur la souscription. `active` :
    //    compte à rebours jusqu'à `renewsAt`.
    ringDeadline() {
      if (!this.currentSubscription) return null
      if (this.currentSubscription.status === 'pending') {
        return this.currentSubscription.startedAt
          ? new Date(new Date(this.currentSubscription.startedAt).getTime() + 2 * 86400000)
          : null
      }
      return this.currentSubscription.renewsAt ? new Date(this.currentSubscription.renewsAt) : null
    },
    ringWindowDays() {
      if (!this.currentSubscription) return 1
      if (this.currentSubscription.status === 'pending') return 2
      return PERIOD_WINDOW_DAYS[this.currentSubscription.billingPeriod] || 30
    },
    ringDaysRemaining() {
      if (!this.ringDeadline) return 0
      return Math.max(0, Math.ceil((this.ringDeadline.getTime() - Date.now()) / 86400000))
    },
    // Un forfait annuel/pluriannuel affiche "365"/"1460" — à taille fixe ça
    // débordait du cercle (repéré en capture). Réduit la police selon le
    // nombre de chiffres plutôt que de fixer une seule taille pour tous les cas.
    ringDaysFontSize() {
      const digits = String(this.ringDaysRemaining).length
      if (digits >= 4) return '0.62rem'
      if (digits === 3) return '0.88rem'
      return '1.15rem'
    },
    // Deux états seulement (pas de palier intermédiaire "warning") — demande
    // explicite, sur le modèle Hostinger : l'anneau se contente de se
    // réduire (le "track" gris qui grandit EST l'effet d'urgence), le rouge
    // n'intervient que dans la toute dernière ligne droite.
    ringSeverity() {
      if (!this.currentSubscription) return 'good'
      if (this.currentSubscription.status === 'pending') {
        return this.ringDaysRemaining >= 1 ? 'good' : 'critical'
      }
      return this.ringDaysRemaining > 3 ? 'good' : 'critical'
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
    // Parité fixe KMF/EUR, voir KMF_PER_EUR — jamais un taux flottant à
    // récupérer côté back, la conversion peut se faire ici directement.
    eurEquivalent(amountKmf) {
      const eur = Number(amountKmf) / KMF_PER_EUR
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(eur)
    },
    formatShortDate(isoDate) {
      // isoDate est un simple "Y-m-d" (pas d'heure) — voir
      // buildDailyRequestSeries() côté back, éviter tout décalage de fuseau
      // en parsant nous-mêmes plutôt que new Date('Y-m-d') (UTC minuit).
      const [y, m, d] = isoDate.split('-')
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(y, m - 1, d))
    },
    // getInstanceByDom ?? init — évite l'erreur ECharts "already initialized"
    // si drawUsageChart() est rappelée (voir recette-dashboard.md §3).
    getChart(ref) {
      const el = this.$refs[ref]
      if (!el) return null
      return echartsGetInstance(el) ?? echartsInit(el)
    },
    // Anneau d'échéance en donut ECharts — équivalence demandée avec la
    // carte "Consommation" (même techno, même feel, voir drawUsageChart()) :
    // avant, un SVG fait main. Deux parts seulement, "Restant" (dégradé
    // accent/danger selon ringSeverity) et "Écoulé" (gris, --color-border) —
    // même principe à deux états que l'ancien SVG (jamais de palier
    // "warning" intermédiaire, voir doc 12). Le nombre de jours reste
    // affiché par-dessus en HTML (.renewal-ring-days, superposé en absolute)
    // — plus simple et plus net qu'un texte centré en `graphic` ECharts.
    drawRingChart() {
      const chart = this.getChart('ringChart')
      if (!chart) return

      const track = cssVar('--color-border', '#e2e8f0')
      const surface = cssVar('--color-surface', '#fff')
      const isCritical = this.ringSeverity === 'critical'
      const gradient = {
        type: 'linear', x: 0, y: 0, x2: 1, y2: 1,
        colorStops: isCritical
          ? [{ offset: 0, color: cssVar('--color-danger', '#ef4444') }, { offset: 1, color: cssVar('--color-danger-dark', '#dc2626') }]
          : [{ offset: 0, color: cssVar('--color-accent', '#22c55e') }, { offset: 1, color: cssVar('--color-accent-dark', '#16a34a') }],
      }

      const remaining = this.ringDaysRemaining
      const elapsed = Math.max(0, this.ringWindowDays - remaining)
      // Garde-fou : si les deux valent 0 (cas limite), un donut tout gris
      // plutôt qu'un graphique vide sans rien à dessiner.
      const safeElapsed = remaining + elapsed > 0 ? elapsed : 1

      chart.setOption({
        tooltip: {
          trigger: 'item',
          formatter: (p) => `${p.name} : <strong>${p.value} jour(s)</strong>`,
        },
        series: [{
          type: 'pie',
          radius: ['72%', '96%'],
          startAngle: 90,
          // scaleSize : le seul cas de ce dashboard où un vrai agrandissement
          // au survol est natif côté ECharts (les parts d'un donut savent
          // grossir, contrairement aux bâtons d'un bar chart — voir la note
          // dans drawUsageChart()).
          emphasis: { scaleSize: 6 },
          label: { show: false },
          data: [
            { value: remaining, name: 'Restant', itemStyle: { color: gradient, borderRadius: 8 } },
            { value: safeElapsed, name: 'Écoulé', itemStyle: { color: track, borderRadius: 0, borderColor: surface, borderWidth: 2 } },
          ],
        }],
      })
    },
    // Barres verticales, un jour = une catégorie — même patron que la
    // section 5.5 de recette-dashboard.md, adapté à une série temporelle
    // plutôt qu'à quelques statuts : gris pour un jour sans appel (honnête,
    // jamais une fausse donnée), accent pour un jour avec de vrais appels.
    drawUsageChart() {
      const chart = this.getChart('usageChart')
      if (!chart) return

      const accent = cssVar('--color-accent', '#22c55e')
      const track = cssVar('--color-border', '#e2e8f0')
      const axisLabel = cssVar('--color-text-secondary', '#64748b')
      const valueLabel = cssVar('--color-heading', '#0f172a')

      chart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (p) => `${p[0].name} : <strong>${p[0].value} requête(s)</strong>`,
        },
        grid: { left: 32, right: 8, top: 26, bottom: 24 },
        xAxis: {
          type: 'category',
          data: this.dailyUsageSeries.map((d) => this.formatShortDate(d.date)),
          axisLabel: { color: axisLabel, fontSize: 10.5 },
          axisLine: { lineStyle: { color: track } },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: track } },
          axisLabel: { color: axisLabel, fontSize: 10.5 },
        },
        series: [{
          type: 'bar',
          barMaxWidth: 26,
          itemStyle: {
            borderRadius: [5, 5, 0, 0],
            color: (params) => (params.value > 0 ? accent : track),
          },
          // ECharts dessine sur un <canvas> : un bâton n'a pas de "taille
          // CSS" à transformer au survol comme avant (scaleY/scaleX) — le
          // survol se traduit ici par le mécanisme natif du graphique
          // (emphasis) : couleur qui ressort + halo, plutôt qu'un
          // agrandissement au pixel près.
          emphasis: {
            itemStyle: {
              color: accent,
              shadowBlur: 14,
              shadowColor: accent,
            },
            label: { fontSize: 13 },
          },
          label: {
            show: true,
            position: 'top',
            color: valueLabel,
            fontWeight: 700,
            fontSize: 11,
            formatter: (p) => (p.value > 0 ? p.value : ''),
          },
          data: this.dailyUsageSeries.map((d) => d.count),
        }],
      })
    },
    // ECharts fige la taille de son <canvas> à celle du conteneur au moment
    // de l'init — jamais réactif tout seul. Sans ça, un canvas initialisé
    // trop tôt (ou avant qu'un menu latéral ne finisse de se replier sur
    // petit écran) garde sa largeur d'origine pour toujours et déborde de la
    // carte, provoquant un scroll horizontal sur toute la page — bug repéré
    // en usage réel. ResizeObserver couvre à la fois le redimensionnement de
    // la fenêtre ET tout changement de taille du conteneur lui-même
    // (repli/dépli de la nav, changement de police...), contrairement à un
    // simple listener sur window.resize.
    observeChartResize() {
      if (typeof ResizeObserver === 'undefined') return
      this.chartResizeObserver = new ResizeObserver(() => {
        this.getChart('usageChart')?.resize()
        this.getChart('ringChart')?.resize()
      })
      // Un seul observer, les deux graphiques du dashboard — un redimensionnement
      // de l'un (repli de carte, police...) suffit à revérifier les deux, sans
      // coût réel (resize() sur un chart déjà à la bonne taille ne fait rien).
      if (this.$refs.usageChart) this.chartResizeObserver.observe(this.$refs.usageChart)
      if (this.$refs.ringChart) this.chartResizeObserver.observe(this.$refs.ringChart)
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
      // $nextTick : le conteneur du chart n'existe dans le DOM qu'une fois
      // le v-if="currentSubscription" résolu par Vue (voir recette-dashboard.md).
      this.$nextTick(() => {
        this.drawUsageChart()
        this.drawRingChart()
        this.observeChartResize()
      })
    }
    if (this.pendingInvoicesCount) {
      this.requestNearbyAgencies()
    }
  },
  beforeUnmount() {
    this.chartResizeObserver?.disconnect()
    ;['usageChart', 'ringChart'].forEach((ref) => {
      const el = this.$refs[ref]
      if (el) echartsGetInstance(el)?.dispose()
    })
  },
}
</script>

<style scoped>
/* Filet de sécurité : plus jamais de scroll horizontal sur cette page, quel
   que soit le contenu (ECharts en particulier — un canvas mal redimensionné
   ne pourra plus faire déborder toute la page, juste être coupé). */
.dash-page {
  max-width: 100%;
  overflow-x: hidden;
}

.hero {
  margin-bottom: 24px;
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
  padding: 10px 22px;
  border-radius: 999px;
  font-family: var(--font-nav);
  font-weight: 600;
  font-size: 0.84rem;
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

/* ── Grille forfait + consommation ─────────────────────  */
.dash-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  /* stretch : les deux cartes s'alignent sur la même hauteur (demande
     explicite) — sûr maintenant que .subscription-actions n'utilise plus
     margin-top: auto (voir plus bas) : un éventuel surplus de hauteur reste
     un vide en bas de la carte forfait, il ne pousse plus les boutons. */
  align-items: stretch;
  max-width: 100%;
}

@media (max-width: 760px) {
  .dash-grid {
    grid-template-columns: 1fr;
  }
}

.panel-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: 0 2px 14px rgba(4, 6, 119, 0.05);
  display: flex;
  flex-direction: column;
}

.panel-card--plan {
  border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
}

.panel-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-card-head-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.panel-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--color-heading);
  margin: 0;
}

.plan-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent-dark);
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plan-title {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--color-heading);
  margin: 0 0 2px;
}

.plan-price {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-primary);
  margin: 0;
}

.plan-price span {
  font-family: var(--font-nav);
  font-weight: 500;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.plan-price-eur {
  font-family: var(--font-nav);
  font-size: 0.74rem;
  color: var(--color-text-secondary);
  margin: 2px 0 0;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
  white-space: nowrap;
}

.status-chip--active {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent-dark);
}

.status-chip--pending {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.subscription-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  /* Jamais margin-top: auto — ça poussait les boutons au fond de la carte
     dès que la carte voisine ("Consommation", plus haute depuis le
     graphique ECharts) forçait une hauteur stretchée. Un espacement fixe
     les garde juste sous l'anneau d'échéance, quelle que soit la hauteur
     de l'autre carte. */
  margin-top: 18px;
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

/* ── Anneau de renouvellement/échéance ─────────────────  */
.subscription-deadline {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.renewal-ring {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.renewal-ring-chart {
  width: 100%;
  height: 100%;
}

.renewal-ring-days {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.15rem;
  color: var(--color-heading);
}

.renewal-ring-days small {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.subscription-deadline-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: left;
}

.subscription-deadline-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.subscription-deadline-date {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.02rem;
  color: var(--color-heading);
}

/* ── Consommation ───────────────────────────────────────  */
.usage-quota {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 16px;
}

.usage-quota-value {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.15rem;
  color: var(--color-heading);
}

.usage-quota-caption {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

/* Données réelles (geo_api_requests), dessinées par ECharts (bar chart, voir
   drawUsageChart()) — hauteur FIXE requise, ECharts calcule son canvas
   dessus, un height: 100% ne suffit pas (recette-dashboard.md §10). Le hover
   par bâton (couleur + halo) est géré côté ECharts (emphasis.itemStyle dans
   drawUsageChart()), plus en CSS ici. */
.usage-chart {
  width: 100%;
  height: 150px;
  max-width: 100%;
  overflow: hidden;
  margin-bottom: 14px;
}

.usage-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: auto 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--color-hover-bg);
  color: var(--color-text-secondary);
  font-size: 0.76rem;
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

/* ── Accès rapide, en liste ─────────────────────────────  */
.quick-list {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 2px 14px rgba(4, 6, 119, 0.05);
  margin-top: 16px;
  overflow: hidden;
}

.quick-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 22px;
  border-bottom: 1px solid var(--color-border);
  text-decoration: none;
  transition: background-color 0.15s;
}

.quick-row:last-child {
  border-bottom: none;
}

.quick-row:hover {
  background: var(--color-hover-bg);
}

.quick-row-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}

.quick-row-icon--indigo {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}

.quick-row-icon--teal {
  background: rgba(13, 148, 136, 0.12);
  color: #0d9488;
}

.quick-row-icon--amber {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.quick-row-icon--violet {
  background: rgba(124, 58, 237, 0.12);
  color: #7c3aed;
}

.quick-row-body {
  flex: 1;
  min-width: 0;
}

.quick-row-body h3 {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--color-heading);
  margin: 0 0 2px;
}

.quick-row-body p {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.quick-row-arrow {
  color: #d1d5db;
  flex-shrink: 0;
}
</style>
