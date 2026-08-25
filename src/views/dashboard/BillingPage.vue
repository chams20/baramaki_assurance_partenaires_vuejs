<template>
  <div class="billing-page">
    <div class="page-head">
      <div>
        <h1 class="page-title"><i class="bi bi-receipt"></i> Facturation</h1>
        <p class="page-subtitle">L'historique de vos factures, à jour à chaque souscription et renouvellement.</p>
      </div>
    </div>

    <div v-if="loading" class="placeholder-card">
      <div class="placeholder-spinner"></div>
    </div>

    <template v-else>
      <div v-if="!invoices.length" class="placeholder-card">
        <div class="placeholder-icon"><i class="bi bi-receipt-cutoff"></i></div>
        <h2 class="placeholder-title">Aucune facture pour le moment</h2>
        <p class="placeholder-text">
          Vos factures apparaîtront ici dès votre première souscription, puis à chaque renouvellement.
        </p>
        <router-link to="/forfaits" class="placeholder-cta">Voir les forfaits</router-link>
      </div>

      <ul v-else class="invoice-list">
        <li v-for="inv in invoices" :key="inv.uuid" class="invoice-row">
          <div class="invoice-row-main">
            <span class="invoice-row-plan">{{ inv.planName || 'Forfait' }}</span>
            <div class="invoice-row-dates">
              <span><i class="bi bi-calendar-plus"></i> Souscrite le {{ formatDate(inv.createdAt) }}</span>
              <span><i class="bi bi-calendar-event"></i> Échéance le {{ formatDate(inv.dueAt) }}</span>
            </div>
          </div>
          <div class="invoice-row-side">
            <span class="invoice-row-amount">{{ Number(inv.amount).toLocaleString('fr-FR') }} {{ inv.currency }}</span>
            <div class="invoice-row-actions">
              <span class="invoice-status" :class="`invoice-status--${inv.status}`">{{ invoiceStatusLabel(inv.status) }}</span>
              <button
                type="button"
                class="invoice-download-btn"
                :disabled="downloadingInvoiceUuid === inv.uuid"
                title="Télécharger la facture (PDF)"
                @click="downloadInvoice(inv)"
              >
                <i class="bi" :class="downloadingInvoiceUuid === inv.uuid ? 'bi-hourglass-split' : 'bi-download'"></i>
              </button>
            </div>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script>
import { useToast } from 'vue-toastification'
import { getMyClient, downloadMyInvoicePdf } from '@/services/geo/geoSelfServiceService'

export default {
  name: 'BillingPage',
  data() {
    return {
      toast: useToast(),
      loading: true,
      myClient: null,
      downloadingInvoiceUuid: null,
    }
  },
  computed: {
    invoices() {
      return this.myClient?.invoices || []
    },
  },
  methods: {
    invoiceStatusLabel(status) {
      return { pending: 'En attente', paid: 'Payée', failed: 'Échouée' }[status] || status
    },
    formatDate(iso) {
      if (!iso) return '—'
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
    },
    async downloadInvoice(invoice) {
      this.downloadingInvoiceUuid = invoice.uuid
      try {
        await downloadMyInvoicePdf(invoice.uuid)
      } catch {
        this.toast.error('Erreur lors de la génération de la facture.')
      } finally {
        this.downloadingInvoiceUuid = null
      }
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
.page-head {
  margin-bottom: 24px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.4rem;
  color: var(--color-primary);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
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

.placeholder-spinner {
  width: 28px; height: 28px; margin: 0 auto; border-radius: 50%;
  border: 3px solid var(--color-border); border-top-color: var(--color-accent);
  animation: placeholderSpin 0.7s linear infinite;
}
@keyframes placeholderSpin { to { transform: rotate(360deg); } }

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

.placeholder-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border-radius: 999px;
  font-family: var(--font-nav);
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  background: var(--color-primary);
  color: #fff;
  transition: background-color 0.15s;
}

.placeholder-cta:hover {
  background: var(--color-primary-dark);
}

.invoice-list {
  list-style: none;
  margin: 0;
  padding: 8px 22px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 2px 14px rgba(4, 6, 119, 0.05);
}

.invoice-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid var(--color-border);
}

.invoice-row:first-child {
  border-top: none;
}

.invoice-row-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.invoice-row-plan {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text);
}

.invoice-row-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
}

.invoice-row-dates span {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.invoice-row-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.invoice-row-amount {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-heading);
}

.invoice-status {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
}

.invoice-status--pending {
  background: color-mix(in srgb, #f59e0b 15%, transparent);
  color: #b45309;
}

.invoice-status--paid {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent-dark);
}

.invoice-status--failed {
  background: var(--color-danger-bg);
  color: var(--color-danger-dark);
}

.invoice-row-actions { display: flex; align-items: center; gap: 6px; }

.invoice-download-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border: 1.5px solid var(--color-border); border-radius: 8px;
  background: var(--color-surface); color: var(--color-primary);
  cursor: pointer; font-size: 0.8rem;
  transition: background-color 0.15s, border-color 0.15s;
}
.invoice-download-btn:hover:not(:disabled) { background: var(--color-hover-bg); border-color: var(--color-primary); }
.invoice-download-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
