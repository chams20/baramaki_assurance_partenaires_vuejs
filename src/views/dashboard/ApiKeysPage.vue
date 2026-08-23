<template>
  <div class="keys-page">
    <div class="page-head">
      <div>
        <h1 class="page-title"><i class="bi bi-key"></i> Clés API</h1>
        <p class="page-subtitle">Générez et gérez les clés qui donnent accès à l'API d'adressage BARAMAKI.</p>
      </div>
      <button v-if="payableSubscriptions.length && !showKeyForm" type="button" class="btn-primary" @click="openKeyForm">
        <i class="bi bi-plus-lg"></i> Générer une clé
      </button>
    </div>

    <div v-if="loading" class="placeholder-card">
      <p class="placeholder-text">Chargement...</p>
    </div>

    <template v-else>
      <p v-if="!currentSubscription" class="panel-empty-text">
        Un abonnement actif est nécessaire pour générer une clé —
        <router-link to="/forfaits">voir les forfaits disponibles</router-link>.
      </p>
      <p v-else-if="!payableSubscriptions.length" class="panel-empty-text panel-empty-text--pending">
        <i class="bi bi-hourglass-split"></i> En attente de votre paiement — vous pourrez générer votre clé
        une fois le paiement validé.
      </p>

      <div v-if="showKeyForm" class="key-gen-form">
        <p v-if="generateKeyError" class="key-gen-error">{{ generateKeyError }}</p>

        <template v-if="payableSubscriptions.length > 1">
          <label class="key-gen-label">Forfait</label>
          <select v-model="newKeySubscriptionUuid" class="key-gen-input">
            <option value="" disabled>Choisir...</option>
            <option v-for="s in payableSubscriptions" :key="s.uuid" :value="s.uuid">{{ s.planName || 'Forfait' }}</option>
          </select>
        </template>

        <label class="key-gen-label">Nom de domaine</label>
        <input v-model.trim="newKeyDomain" type="text" class="key-gen-input" placeholder="exemple.km" />
        <p class="key-gen-hint">La clé sera restreinte à ce domaine uniquement — besoin d'un autre
          site/app ? Générez une deuxième clé pour ce même forfait.</p>

        <div class="key-gen-actions">
          <button type="button" class="key-gen-btn key-gen-btn--ghost" :disabled="generatingKey" @click="showKeyForm = false">Annuler</button>
          <button type="button" class="key-gen-btn key-gen-btn--primary" :disabled="generatingKey" @click="handleGenerateKey">
            {{ generatingKey ? 'Génération...' : 'Générer' }}
          </button>
        </div>
      </div>

      <!-- Révélation unique de la clé complète -->
      <div v-if="revealedKey" class="key-reveal">
        <p class="key-reveal-warning">
          <i class="bi bi-exclamation-triangle-fill"></i> Copiez cette clé maintenant — elle ne sera plus
          jamais affichée en entier.
        </p>
        <div class="key-reveal-code">
          <span>{{ revealedKey }}</span>
          <button type="button" class="key-copy-btn" :class="{ 'key-copy-btn--done': keyCopied }" @click="copyRevealedKey">
            <i class="bi" :class="keyCopied ? 'bi-check-lg' : 'bi-clipboard'"></i>
            {{ keyCopied ? 'Copié' : 'Copier' }}
          </button>
        </div>
        <button type="button" class="key-reveal-done" @click="revealedKey = null">J'ai copié la clé</button>
      </div>

      <p v-else-if="payableSubscriptions.length && !keys.length" class="panel-empty-text">
        Aucune clé générée pour l'instant.
      </p>

      <ul v-if="keys.length" class="key-list">
        <li v-for="k in keys" :key="k.uuid" class="key-row">
          <div class="key-row-main">
            <span class="key-row-prefix">{{ k.keyPrefix }}…</span>
            <span class="key-row-date">{{ k.planName || 'Forfait' }} · {{ k.domain }}</span>
          </div>
          <div class="key-row-side">
            <span class="invoice-status" :class="k.isRevoked ? 'invoice-status--failed' : 'invoice-status--paid'">
              {{ k.isRevoked ? 'Révoquée' : 'Active' }}
            </span>
            <button v-if="!k.isRevoked" type="button" class="key-revoke-btn" @click="handleRevokeKey(k)">Révoquer</button>
          </div>
        </li>
      </ul>

      <div v-if="keys.length" class="key-usage">
        <p class="key-usage-title">Comment l'utiliser</p>
        <p class="key-usage-text">
          Envoyez la clé dans l'en-tête <code>X-Api-Key</code> de vos appels à l'API d'adressage BARAMAKI :
        </p>
        <pre class="key-usage-code">X-Api-Key: bmk_live_...
GET {{ apiBaseUrl }}/api/geo/suggest?q=...</pre>
      </div>
    </template>
  </div>
</template>

<script>
import { useToast } from 'vue-toastification'
import { getMyClient, generateMyKey, revokeMyKey } from '@/services/geo/geoSelfServiceService'

export default {
  name: 'ApiKeysPage',
  data() {
    return {
      toast: useToast(),
      loading: true,
      myClient: null,
      showKeyForm: false,
      newKeySubscriptionUuid: '',
      newKeyDomain: '',
      generateKeyError: null,
      generatingKey: false,
      revealedKey: null,
      keyCopied: false,
    }
  },
  computed: {
    currentSubscription() {
      return (this.myClient?.subscriptions || []).find((s) => s.status === 'active' || s.status === 'pending') || null
    },
    eligibleSubscriptions() {
      return (this.myClient?.subscriptions || []).filter((s) => s.status === 'active' || s.status === 'pending')
    },
    // Un forfait `active` (donc déjà payé une fois) ne suffit pas non plus
    // pour une facture de RENOUVELLEMENT en attente — la clé reste bloquée
    // jusqu'à ce que la dernière facture, quelle qu'elle soit, soit payée.
    payableSubscriptions() {
      return this.eligibleSubscriptions.filter((s) => s.status === 'active' && s.latestInvoiceStatus === 'paid')
    },
    keys() {
      return this.myClient?.keys || []
    },
    apiBaseUrl() {
      return import.meta.env.VITE_APP_BACK_API_URL
    },
  },
  methods: {
    openKeyForm() {
      this.showKeyForm = true
      this.newKeySubscriptionUuid = this.payableSubscriptions.length === 1 ? this.payableSubscriptions[0].uuid : ''
      this.newKeyDomain = ''
      this.generateKeyError = null
    },
    async handleGenerateKey() {
      const subscriptionId = this.payableSubscriptions.length === 1 ? this.payableSubscriptions[0].uuid : this.newKeySubscriptionUuid
      if (!subscriptionId) {
        this.generateKeyError = 'Choisissez un forfait.'
        return
      }
      if (!this.newKeyDomain) {
        this.generateKeyError = 'Le nom de domaine est requis.'
        return
      }
      this.generatingKey = true
      this.generateKeyError = null
      try {
        const { client, plainKey } = await generateMyKey({ subscriptionId, domain: this.newKeyDomain })
        this.myClient = client
        this.revealedKey = plainKey
        this.keyCopied = false
        this.showKeyForm = false
      } catch (err) {
        this.generateKeyError = err.response?.data?.message || 'Erreur lors de la génération de la clé.'
      } finally {
        this.generatingKey = false
      }
    },
    async copyRevealedKey() {
      if (!this.revealedKey) return
      await navigator.clipboard.writeText(this.revealedKey)
      this.keyCopied = true
      setTimeout(() => { this.keyCopied = false }, 2000)
    },
    async handleRevokeKey(key) {
      try {
        this.myClient = await revokeMyKey(key.uuid)
        this.toast.success('Clé révoquée.')
      } catch (err) {
        this.toast.error(err.response?.data?.message || 'Erreur lors de la révocation.')
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
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

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-family: var(--font-nav);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.15s;
  flex-shrink: 0;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.placeholder-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 40px 32px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(4, 6, 119, 0.06);
}

.placeholder-text {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.panel-empty-text {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0 0 16px;
}

.panel-empty-text a {
  color: var(--color-primary);
  font-weight: 600;
}

.panel-empty-text--pending {
  display: flex;
  align-items: center;
  gap: 8px;
  background: color-mix(in srgb, #f59e0b 10%, transparent);
  color: #b45309;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 600;
}

/* ── Clés API ─────────────────────────────────────────  */
.key-gen-form {
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 2px 14px rgba(4, 6, 119, 0.05);
}

.key-gen-error {
  font-size: 0.8rem;
  color: var(--color-danger-dark);
  margin: 0 0 4px;
}

.key-gen-label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--color-text);
}

.key-gen-input {
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--color-text);
  background: var(--color-surface);
  outline: none;
}

.key-gen-input:focus {
  border-color: var(--color-accent);
}

.key-gen-hint {
  font-size: 0.74rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.key-gen-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.key-gen-btn {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

.key-gen-btn--ghost {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.key-gen-btn--primary {
  background: var(--color-accent);
  color: #fff;
}

.key-reveal {
  background: color-mix(in srgb, var(--color-accent) 6%, transparent);
  border: 1px dashed var(--color-accent);
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 20px;
}

.key-reveal-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--color-accent-dark);
  margin: 0 0 10px;
}

.key-reveal-code {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 12px;
  font-family: 'Courier New', monospace;
  font-size: 0.82rem;
  word-break: break-all;
}

.key-copy-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-hover-bg);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text);
}

.key-copy-btn--done {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.key-reveal-done {
  margin-top: 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-accent-dark);
  font-weight: 700;
  font-size: 0.78rem;
}

.key-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 8px 22px;
  box-shadow: 0 2px 14px rgba(4, 6, 119, 0.05);
}

.key-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid var(--color-border);
}

.key-row:first-child {
  border-top: none;
}

.key-row-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.key-row-prefix {
  font-family: 'Courier New', monospace;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--color-heading);
}

.key-row-date {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.key-row-side {
  display: flex;
  align-items: center;
  gap: 10px;
}

.invoice-status {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
}

.invoice-status--paid {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent-dark);
}

.invoice-status--failed {
  background: var(--color-danger-bg);
  color: var(--color-danger-dark);
}

.key-revoke-btn {
  background: none;
  border: 1px solid var(--color-danger-dark);
  color: var(--color-danger-dark);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.key-usage {
  margin-top: 20px;
  padding: 18px 22px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 2px 14px rgba(4, 6, 119, 0.05);
}

.key-usage-title {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0 0 6px;
}

.key-usage-text {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  margin: 0 0 8px;
}

.key-usage-text code {
  background: var(--color-hover-bg);
  border-radius: 4px;
  padding: 1px 5px;
  font-family: 'Courier New', monospace;
}

.key-usage-code {
  background: var(--color-hover-bg);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
