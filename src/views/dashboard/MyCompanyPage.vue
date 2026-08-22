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

    <main class="company-main">
      <h1 class="company-title">Mon entreprise</h1>
      <p class="company-subtitle">Nom, logo, coordonnées, adresse du siège et justificatifs — visibles par
        BARAMAKI, jamais par un autre partenaire.</p>

      <div v-if="loading" class="company-loading">
        <div class="company-spinner"></div>
        <p>Chargement...</p>
      </div>

      <template v-else-if="myClient">
        <!-- Logo + nom -->
        <section class="company-card">
          <div class="company-identity">
            <div class="logo-wrap">
              <img v-if="logoUrl" :src="logoUrl" class="logo" alt="Logo de l'entreprise" />
              <div v-else class="logo logo--placeholder"><i class="bi bi-building"></i></div>

              <label class="logo-edit-btn" title="Changer le logo">
                <i class="bi bi-camera"></i>
                <input type="file" class="visually-hidden" accept="image/png,image/jpeg,image/webp" @change="onLogoChange" />
              </label>

              <button
                v-if="logoUrl && !logoFile"
                type="button"
                class="logo-remove-btn"
                title="Retirer le logo"
                @click="showRemoveLogoModal = true"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <div class="identity-text">
              <h2 class="identity-name">{{ myClient.companyName || 'Entreprise à renseigner' }}</h2>
              <span class="identity-status" :class="myClient.status === 'active' ? 'status--active' : 'status--revoked'">
                {{ myClient.status === 'active' ? 'Compte actif' : 'Accès révoqué' }}
              </span>
            </div>
          </div>

          <div v-if="logoFile" class="logo-pending-actions">
            <span class="logo-pending-hint">Nouveau logo sélectionné.</span>
            <button type="button" class="btn-ghost" :disabled="logoUploading" @click="cancelLogoChange">Annuler</button>
            <button type="button" class="btn-primary" :disabled="logoUploading" @click="confirmLogoChange">
              {{ logoUploading ? 'Envoi...' : 'Enregistrer le logo' }}
            </button>
          </div>
        </section>

        <!-- Informations -->
        <section class="company-card">
          <div class="card-head">
            <h3 class="card-title"><i class="bi bi-info-circle"></i> Informations</h3>
            <button type="button" class="link-btn" @click="editingInfo ? cancelEditInfo() : startEditInfo()">
              <i class="bi" :class="editingInfo ? 'bi-x-lg' : 'bi-pencil'"></i> {{ editingInfo ? 'Annuler' : 'Modifier' }}
            </button>
          </div>

          <div v-if="infoError" class="company-alert">{{ infoError }}</div>

          <form v-if="editingInfo" class="company-form" @submit.prevent="handleSaveInfo">
            <div class="field">
              <label class="field-label">Nom de l'entreprise</label>
              <input v-model.trim="infoForm.companyName" type="text" class="field-control" placeholder="Comores Delivery" />
            </div>
            <div class="field">
              <label class="field-label">Téléphone de l'entreprise</label>
              <PhoneInput v-model:phone="infoForm.companyPhone" v-model:country="infoForm.companyPhoneCountry" :hint="false" />
              <p class="field-hint">Le standard de l'entreprise — distinct du téléphone du contact ci-dessous.</p>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary" :disabled="savingInfo">
                {{ savingInfo ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </form>

          <div v-else class="info-grid">
            <div class="info-row">
              <span class="info-label">Téléphone entreprise</span>
              <span>{{ myClient.companyPhone || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Contact (vous)</span>
              <span>{{ myClient.contactEmail }}<template v-if="myClient.contactPhone"> · {{ myClient.contactPhone }}</template></span>
            </div>
          </div>
        </section>

        <!-- Adresse du siège -->
        <section class="company-card">
          <div class="card-head">
            <h3 class="card-title"><i class="bi bi-geo-alt"></i> Adresse du siège</h3>
            <button type="button" class="link-btn" @click="editingAddress ? cancelEditAddress() : startEditAddress()">
              <i class="bi" :class="editingAddress ? 'bi-x-lg' : 'bi-pencil'"></i> {{ editingAddress ? 'Annuler' : 'Modifier' }}
            </button>
          </div>

          <div v-if="addressError" class="company-alert">{{ addressError }}</div>

          <form v-if="editingAddress" class="company-form" @submit.prevent="handleSaveAddress">
            <div class="field">
              <label class="field-label">Pays</label>
              <select v-model="addressForm.country" class="field-control" @change="onCountryChange">
                <option value="" disabled>Choisir un pays…</option>
                <option v-for="c in supportedCountries" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>

            <div v-if="addressForm.country" class="field search-wrap">
              <label class="field-label">Rechercher l'adresse</label>
              <div class="search-box">
                <i class="bi bi-search search-icon"></i>
                <input
                  v-model="addressQuery"
                  type="text"
                  :placeholder="addressForm.country === 'Comores' ? 'Ex : Moroni, Mvouni, Itsandra…' : 'Ex : 12 rue de la Paix, Paris'"
                  autocomplete="off"
                  @input="onAddressSearchInput"
                  @focus="showSuggestions = true"
                  @blur="hideSuggestionsDelayed"
                />
                <span v-if="searching" class="search-spinner"></span>
              </div>

              <ul v-if="showSuggestions && suggestions.length" class="suggestions">
                <li v-for="(s, i) in suggestions" :key="i" class="suggestion-item" @mousedown.prevent="selectSuggestion(s)">
                  <i class="bi bi-geo"></i> {{ s.label }}
                </li>
              </ul>
              <p v-else-if="showSuggestions && addressQuery.trim().length >= 2 && !searching" class="search-hint">
                Aucun résultat — vous pouvez remplir les champs ci-dessous à la main.
              </p>
            </div>

            <div class="fields-grid">
              <div class="field">
                <label class="field-label">Rue</label>
                <input v-model="addressForm.street" type="text" class="field-control" />
              </div>
              <div v-if="addressForm.country !== 'Comores'" class="field">
                <label class="field-label">Numéro</label>
                <input v-model="addressForm.streetNumber" type="text" class="field-control" />
              </div>
              <div class="field">
                <label class="field-label">Complément</label>
                <input v-model="addressForm.addressComplement" type="text" class="field-control" placeholder="Bât. B, Bureau 5" />
              </div>
              <div class="field">
                <label class="field-label">{{ addressForm.country === 'Comores' ? 'Commune' : 'Ville' }}</label>
                <input v-model="addressForm.city" type="text" class="field-control" />
              </div>
              <div v-if="addressForm.country !== 'Comores'" class="field">
                <label class="field-label">Code postal</label>
                <input v-model="addressForm.postalCode" type="text" class="field-control" />
              </div>
              <template v-if="addressForm.country === 'Comores'">
                <div class="field">
                  <label class="field-label">Île</label>
                  <input v-model="addressForm.island" type="text" class="field-control" />
                </div>
                <div class="field">
                  <label class="field-label">Région</label>
                  <input v-model="addressForm.region" type="text" class="field-control" />
                </div>
                <div class="field">
                  <label class="field-label">Village</label>
                  <input v-model="addressForm.village" type="text" class="field-control" />
                </div>
                <div class="field">
                  <label class="field-label">Quartier</label>
                  <input v-model="addressForm.neighborhood" type="text" class="field-control" />
                </div>
              </template>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary" :disabled="savingAddress">
                {{ savingAddress ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </form>

          <p v-else-if="myClient.address.fullAddress" class="address-text">{{ myClient.address.fullAddress }}</p>
          <p v-else class="empty-hint">Adresse non renseignée.</p>
        </section>

        <!-- Documents -->
        <section class="company-card">
          <div class="card-head">
            <h3 class="card-title"><i class="bi bi-folder2-open"></i> Documents</h3>
            <button type="button" class="link-btn" @click="openDocumentModal">
              <i class="bi bi-plus-lg"></i> Ajouter
            </button>
          </div>

          <p v-if="!myClient.documents.length" class="empty-hint">
            Aucun justificatif déposé — KBIS ou équivalent, statuts, pièce d'identité du représentant...
          </p>

          <div v-else class="doc-list">
            <a
              v-for="doc in myClient.documents"
              :key="doc.uuid"
              :href="doc.path"
              target="_blank"
              rel="noopener"
              class="doc-item"
            >
              <div class="doc-icon"><i class="bi bi-file-earmark-text"></i></div>
              <div class="doc-info">
                <span class="doc-type">{{ documentTypeLabel(doc.type) }}</span>
                <span class="doc-filename">{{ doc.filename }}</span>
              </div>
              <button type="button" class="doc-delete" title="Supprimer" @click.stop.prevent="docToDelete = doc">
                <i class="bi bi-trash3"></i>
              </button>
            </a>
          </div>
        </section>

        <!-- Déconnexion — tout en bas, hors du reste de la navigation -->
        <div class="logout-zone">
          <button type="button" class="logout-btn" @click="showLogoutModal = true">
            <i class="bi bi-box-arrow-right"></i> Déconnexion
          </button>
        </div>
      </template>

      <div v-else class="company-alert">
        Aucune fiche partenaire trouvée pour votre compte — contactez BARAMAKI.
      </div>
    </main>

    <!-- Confirmation déconnexion -->
    <div v-if="showLogoutModal" class="modal-backdrop" @click.self="!loggingOut && (showLogoutModal = false)">
      <div class="modal-box">
        <template v-if="!loggingOut">
          <h4 class="modal-title">Se déconnecter ?</h4>
          <p class="modal-text">Vous devrez vous reconnecter pour retrouver votre espace.</p>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="showLogoutModal = false">Annuler</button>
            <button type="button" class="btn-danger" @click="confirmLogout">Se déconnecter</button>
          </div>
        </template>
        <div v-else class="logout-progress">
          <div class="logout-progress-spinner"></div>
          <p class="logout-progress-text">Déconnexion en cours...</p>
        </div>
      </div>
    </div>

    <!-- Confirmation retrait logo -->
    <div v-if="showRemoveLogoModal" class="modal-backdrop" @click.self="showRemoveLogoModal = false">
      <div class="modal-box">
        <h4 class="modal-title">Retirer le logo ?</h4>
        <p class="modal-text">Cette action est immédiate.</p>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" :disabled="logoUploading" @click="showRemoveLogoModal = false">Annuler</button>
          <button type="button" class="btn-danger" :disabled="logoUploading" @click="confirmRemoveLogo">
            {{ logoUploading ? 'Suppression...' : 'Retirer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation suppression document -->
    <div v-if="docToDelete" class="modal-backdrop" @click.self="docToDelete = null">
      <div class="modal-box">
        <h4 class="modal-title">Supprimer ce document ?</h4>
        <p class="modal-text">
          Supprimer <strong>{{ documentTypeLabel(docToDelete.type) }}</strong> ({{ docToDelete.filename }}) ? Cette
          action est irréversible.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" :disabled="deletingDocument" @click="docToDelete = null">Annuler</button>
          <button type="button" class="btn-danger" :disabled="deletingDocument" @click="confirmDeleteDocument">
            {{ deletingDocument ? 'Suppression...' : 'Supprimer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal ajout document -->
    <div v-if="showDocumentModal" class="modal-backdrop" @click.self="closeDocumentModal">
      <div class="modal-box">
        <div class="modal-head">
          <h4 class="modal-title"><i class="bi bi-folder2-open"></i> Ajouter un justificatif</h4>
          <button type="button" class="modal-close" @click="closeDocumentModal"><i class="bi bi-x-lg"></i></button>
        </div>

        <div v-if="documentError" class="company-alert">{{ documentError }}</div>

        <div class="field" style="margin-bottom: 14px">
          <label class="field-label">Type de document</label>
          <select v-model="documentForm.type" class="field-control">
            <option value="KBIS">Extrait KBIS ou équivalent</option>
            <option value="REGISTRE_COMMERCE">Registre du commerce</option>
            <option value="STATUTS">Statuts de la société</option>
            <option value="ID_REPRESENTANT">Pièce d'identité du représentant</option>
            <option value="OTHER">Autre...</option>
          </select>
        </div>

        <div v-if="documentForm.type === 'OTHER'" class="field" style="margin-bottom: 14px">
          <label class="field-label">Précisez le type de document</label>
          <input v-model.trim="documentForm.otherType" type="text" class="field-control" placeholder="Ex. Attestation fiscale" />
        </div>

        <div class="field" style="margin-bottom: 20px">
          <label class="field-label">Fichier</label>
          <label class="upload-zone" :class="{ 'upload-zone--filled': documentForm.file }">
            <input
              type="file"
              class="upload-input"
              accept="image/jpeg,image/png,application/pdf"
              @change="documentForm.file = $event.target.files[0] || null"
            />
            <i :class="documentForm.file ? 'bi bi-file-earmark-check-fill' : 'bi bi-cloud-arrow-up'" class="upload-icon"></i>
            <span v-if="documentForm.file" class="upload-filename">{{ documentForm.file.name }}</span>
            <span v-else class="upload-hint">Cliquer pour choisir un fichier</span>
          </label>
          <p class="field-hint">JPEG, PNG ou PDF — 10 Mo maximum.</p>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-ghost" :disabled="savingDocument" @click="closeDocumentModal">Annuler</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="!documentForm.file || (documentForm.type === 'OTHER' && !documentForm.otherType) || savingDocument"
            @click="handleAddDocument"
          >
            {{ savingDocument ? 'Ajout...' : 'Ajouter' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useToast } from 'vue-toastification'
import { logout } from '@/services/auth/authService'
import {
  getMyClient,
  updateMyClient,
  uploadMyClientLogo,
  removeMyClientLogo,
  addMyClientDocument,
  deleteMyClientDocument,
} from '@/services/geo/geoSelfServiceService'
import { suggestAddress, getSupportedCountries } from '@/services/geo/addressSuggestService'
import PhoneInput from '@/components/shared/PhoneInput.vue'
import { parsePhone } from '@/utils/phone'

function emptyAddressForm() {
  return {
    country: '',
    street: '',
    streetNumber: '',
    addressComplement: '',
    city: '',
    postalCode: '',
    island: '',
    region: '',
    village: '',
    neighborhood: '',
    lat: null,
    lng: null,
  }
}

export default {
  name: 'MyCompanyPage',
  components: { PhoneInput },
  data() {
    return {
      toast: useToast(),
      loading: true,
      myClient: null,

      logoFile: null,
      logoPreview: null,
      logoUploading: false,
      showRemoveLogoModal: false,

      editingInfo: false,
      infoForm: { companyName: '', companyPhone: '', companyPhoneCountry: 'KM' },
      infoError: null,
      savingInfo: false,

      editingAddress: false,
      addressForm: emptyAddressForm(),
      addressQuery: '',
      suggestions: [],
      searching: false,
      showSuggestions: false,
      searchTimer: null,
      addressError: null,
      savingAddress: false,

      showDocumentModal: false,
      documentForm: { type: 'KBIS', otherType: '', file: null },
      documentError: null,
      savingDocument: false,
      docToDelete: null,
      deletingDocument: false,

      showLogoutModal: false,
      loggingOut: false,
    }
  },
  computed: {
    logoUrl() {
      return this.logoPreview || this.myClient?.logoPath || null
    },
    supportedCountries() {
      return getSupportedCountries()
    },
  },
  methods: {
    async load() {
      this.loading = true
      try {
        this.myClient = await getMyClient()
      } catch {
        this.myClient = null
      } finally {
        this.loading = false
      }
    },
    documentTypeLabel(type) {
      return (
        {
          KBIS: 'Extrait KBIS ou équivalent',
          REGISTRE_COMMERCE: 'Registre du commerce',
          STATUTS: 'Statuts de la société',
          ID_REPRESENTANT: "Pièce d'identité du représentant",
        }[type] || type
      )
    },
    // ── Logo ──────────────────────────────────────────
    onLogoChange(e) {
      const file = e.target.files[0]
      if (!file) return
      this.logoFile = file
      this.logoPreview = URL.createObjectURL(file)
    },
    cancelLogoChange() {
      this.logoFile = null
      this.logoPreview = null
    },
    async confirmLogoChange() {
      if (!this.logoFile) return
      this.logoUploading = true
      try {
        this.myClient = await uploadMyClientLogo(this.logoFile)
        this.logoFile = null
        this.logoPreview = null
        this.toast.success('Logo mis à jour.')
      } catch (err) {
        this.toast.error(err.response?.data?.message || "Erreur lors de l'envoi du logo.")
      } finally {
        this.logoUploading = false
      }
    },
    async confirmRemoveLogo() {
      this.logoUploading = true
      try {
        this.myClient = await removeMyClientLogo()
        this.toast.success('Logo retiré.')
      } catch (err) {
        this.toast.error(err.response?.data?.message || 'Erreur lors du retrait du logo.')
      } finally {
        this.logoUploading = false
        this.showRemoveLogoModal = false
      }
    },
    // ── Informations ──────────────────────────────────
    startEditInfo() {
      const { country, raw } = parsePhone(this.myClient.companyPhone)
      this.infoForm = {
        companyName: this.myClient.companyName || '',
        companyPhone: raw,
        companyPhoneCountry: country,
      }
      this.infoError = null
      this.editingInfo = true
    },
    cancelEditInfo() {
      this.editingInfo = false
      this.infoError = null
    },
    async handleSaveInfo() {
      if (!this.infoForm.companyName.trim()) {
        this.infoError = "Le nom de l'entreprise est requis."
        return
      }
      this.savingInfo = true
      this.infoError = null
      try {
        this.myClient = await updateMyClient({ ...this.infoForm })
        this.toast.success('Informations mises à jour.')
        this.editingInfo = false
      } catch (err) {
        this.infoError = err.response?.data?.message || 'Erreur lors de la mise à jour.'
      } finally {
        this.savingInfo = false
      }
    },
    // ── Adresse ───────────────────────────────────────
    startEditAddress() {
      const a = this.myClient.address || {}
      this.addressForm = {
        country: a.country || '',
        street: a.street || '',
        streetNumber: a.streetNumber || '',
        addressComplement: a.addressComplement || '',
        city: a.city || '',
        postalCode: a.postalCode || '',
        island: a.island || '',
        region: a.region || '',
        village: a.village || '',
        neighborhood: a.neighborhood || '',
        lat: a.latitude ?? null,
        lng: a.longitude ?? null,
      }
      this.addressQuery = ''
      this.suggestions = []
      this.addressError = null
      this.editingAddress = true
    },
    cancelEditAddress() {
      this.editingAddress = false
      this.suggestions = []
      this.addressQuery = ''
    },
    onCountryChange() {
      this.addressQuery = ''
      this.suggestions = []
      this.resetSuggestionFields()
    },
    resetSuggestionFields() {
      this.addressForm.street = ''
      this.addressForm.streetNumber = ''
      this.addressForm.city = ''
      this.addressForm.postalCode = ''
      this.addressForm.island = ''
      this.addressForm.region = ''
      this.addressForm.village = ''
      this.addressForm.neighborhood = ''
      this.addressForm.lat = null
      this.addressForm.lng = null
    },
    onAddressSearchInput() {
      clearTimeout(this.searchTimer)
      this.suggestions = []
      this.showSuggestions = true

      if (this.addressQuery.trim() === '') {
        this.resetSuggestionFields()
        return
      }
      if (this.addressQuery.trim().length < 2) return

      this.searching = true
      this.searchTimer = setTimeout(async () => {
        try {
          this.suggestions = await suggestAddress({ country: this.addressForm.country, query: this.addressQuery })
        } catch {
          this.suggestions = []
        } finally {
          this.searching = false
        }
      }, 220)
    },
    hideSuggestionsDelayed() {
      setTimeout(() => {
        this.showSuggestions = false
      }, 150)
    },
    selectSuggestion(s) {
      this.addressForm.street = s.street || ''
      this.addressForm.streetNumber = s.streetNumber || ''
      this.addressForm.city = s.city || ''
      this.addressForm.postalCode = s.postalCode || ''
      this.addressForm.island = s.island || ''
      this.addressForm.region = s.region || ''
      this.addressForm.village = s.village || ''
      this.addressForm.neighborhood = s.neighborhood || ''
      this.addressForm.lat = s.latitude
      this.addressForm.lng = s.longitude

      this.addressQuery = s.label
      this.suggestions = []
      this.showSuggestions = false
    },
    async handleSaveAddress() {
      this.addressError = null
      if (!this.addressForm.country) {
        this.addressError = 'Choisissez un pays.'
        return
      }

      const payload = {
        addressCountry: this.addressForm.country,
        addressStreet: this.addressForm.street || null,
        addressStreetNumber: this.addressForm.streetNumber || null,
        addressComplement: this.addressForm.addressComplement || null,
        addressCity: this.addressForm.city || null,
        addressPostalCode: this.addressForm.postalCode || null,
        addressIsland: this.addressForm.island || null,
        addressRegion: this.addressForm.region || null,
        addressVillage: this.addressForm.village || null,
        addressNeighborhood: this.addressForm.neighborhood || null,
      }
      if (this.addressForm.lat !== null && this.addressForm.lng !== null) {
        payload.addressLat = this.addressForm.lat
        payload.addressLng = this.addressForm.lng
      }

      this.savingAddress = true
      try {
        this.myClient = await updateMyClient(payload)
        this.toast.success('Adresse mise à jour.')
        this.editingAddress = false
      } catch (err) {
        this.addressError = err.response?.data?.message || "Erreur lors de l'enregistrement de l'adresse."
      } finally {
        this.savingAddress = false
      }
    },
    // ── Documents ─────────────────────────────────────
    openDocumentModal() {
      this.documentForm = { type: 'KBIS', otherType: '', file: null }
      this.documentError = null
      this.showDocumentModal = true
    },
    closeDocumentModal() {
      this.showDocumentModal = false
    },
    async handleAddDocument() {
      if (!this.documentForm.file) return
      if (this.documentForm.type === 'OTHER' && !this.documentForm.otherType) return
      this.documentError = null
      this.savingDocument = true
      try {
        const type = this.documentForm.type === 'OTHER' ? this.documentForm.otherType : this.documentForm.type
        this.myClient = await addMyClientDocument({ type, file: this.documentForm.file })
        this.toast.success('Document ajouté.')
        this.showDocumentModal = false
      } catch (err) {
        this.documentError = err.response?.data?.message || "Erreur lors de l'ajout du document."
      } finally {
        this.savingDocument = false
      }
    },
    async confirmDeleteDocument() {
      if (!this.docToDelete) return
      this.deletingDocument = true
      try {
        this.myClient = await deleteMyClientDocument(this.docToDelete.uuid)
        this.toast.success('Document supprimé.')
        this.docToDelete = null
      } catch (err) {
        this.toast.error(err.response?.data?.message || 'Erreur lors de la suppression.')
      } finally {
        this.deletingDocument = false
      }
    },
    // ── Déconnexion ───────────────────────────────────
    async confirmLogout() {
      this.loggingOut = true
      // Délai volontaire — le temps d'une "prise de conscience" avant de
      // couper la session, pas un clic qui éjecte instantanément.
      await new Promise((resolve) => setTimeout(resolve, 2500))
      await logout()
      this.$router.push('/login')
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

.company-main { max-width: 880px; margin: 0 auto; padding: 40px 24px 60px; }
.company-title { font-family: var(--font-heading); font-weight: 800; font-size: 1.5rem; color: var(--color-primary); margin: 0 0 6px; }
.company-subtitle { font-size: 0.85rem; color: var(--color-text-secondary); margin: 0 0 28px; line-height: 1.6; }

.company-loading { text-align: center; padding: 60px 20px; color: var(--color-text-secondary); }
.company-spinner {
  width: 28px; height: 28px; margin: 0 auto 12px; border-radius: 50%;
  border: 3px solid var(--color-border); border-top-color: var(--color-accent);
  animation: companySpin 0.7s linear infinite;
}
@keyframes companySpin { to { transform: rotate(360deg); } }

.company-card {
  background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px;
  padding: 24px 26px; margin-bottom: 20px; box-shadow: 0 2px 14px rgba(4, 6, 119, 0.05);
}

.company-alert { background: var(--color-danger-bg); color: var(--color-danger-dark); border-radius: 10px; padding: 12px 16px; font-size: 0.85rem; }

/* ── Identité / logo ─────────────────────────────────  */
.company-identity { display: flex; align-items: center; gap: 18px; }

.logo-wrap { position: relative; flex-shrink: 0; }
.logo { width: 72px; height: 72px; border-radius: 16px; object-fit: cover; border: 3px solid var(--color-hover-bg); }
.logo--placeholder {
  display: flex; align-items: center; justify-content: center;
  background: var(--color-hover-bg-alt); color: var(--color-text-muted); font-size: 1.8rem;
}

.logo-edit-btn {
  position: absolute; bottom: -2px; right: -2px;
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid var(--color-surface); background: var(--color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.logo-remove-btn {
  position: absolute; top: -2px; right: -2px;
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid var(--color-surface); background: #64748b; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6rem; cursor: pointer; padding: 0; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.logo-remove-btn:hover { background: #475569; }

.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }

.identity-name { font-family: var(--font-heading); font-weight: 800; font-size: 1.1rem; color: var(--color-heading); margin: 0 0 6px; }
.identity-status { font-size: 0.72rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
.status--active { background: color-mix(in srgb, var(--color-accent) 15%, transparent); color: var(--color-accent-dark); }
.status--revoked { background: var(--color-hover-bg); color: var(--color-text-secondary); }

.logo-pending-actions { display: flex; align-items: center; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border); }
.logo-pending-hint { font-size: 0.8rem; color: var(--color-text-secondary); flex: 1; }

/* ── Cartes génériques ───────────────────────────────  */
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.card-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-heading); font-weight: 700; font-size: 0.92rem; color: var(--color-primary); margin: 0; }

.link-btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: none; border: none; cursor: pointer;
  color: var(--color-accent-dark); font-weight: 700; font-size: 0.78rem;
  font-family: var(--font-nav);
}

.info-grid { display: flex; flex-direction: column; gap: 10px; }
.info-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.85rem; }
.info-label { color: var(--color-text-muted); font-size: 0.78rem; }

.empty-hint { font-size: 0.83rem; color: var(--color-text-muted); font-style: italic; margin: 0; }
.address-text { font-size: 0.87rem; color: var(--color-text); margin: 0; line-height: 1.55; }

/* ── Formulaires ──────────────────────────────────────  */
.company-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-family: var(--font-nav); font-size: 0.78rem; font-weight: 600; color: var(--color-text); }
.field-hint { font-size: 0.72rem; color: var(--color-text-muted); margin: 0; }

.field-control {
  width: 100%; padding: 10px 13px;
  border: 1px solid var(--color-border) !important; border-radius: 10px !important;
  font-size: 0.88rem; color: var(--color-text); background: var(--color-surface) !important;
  outline: none; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s;
}
.field-control:focus { border-color: var(--color-accent) !important; box-shadow: 0 0 0 3px rgba(26, 204, 141, 0.18) !important; }

.fields-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 16px; }
.fields-grid .field { margin-bottom: 0; }

.search-wrap { position: relative; }
.search-box {
  position: relative; display: flex; align-items: center;
  background: var(--color-surface); border: 1.5px solid var(--color-border); border-radius: 10px;
  padding: 0.15rem 0.75rem; transition: border-color 0.15s, box-shadow 0.15s;
}
.search-box:focus-within { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(26, 204, 141, 0.18); }
.search-icon { color: var(--color-text-muted); margin-right: 0.5rem; flex-shrink: 0; }
.search-box input { flex: 1; border: none !important; outline: none; background: transparent !important; padding: 0.6rem 0 !important; font-size: 0.88rem; color: var(--color-text); }
.search-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--color-border); border-top-color: var(--color-accent); animation: companySpin 0.7s linear infinite; flex-shrink: 0; }

.suggestions {
  list-style: none; margin: 4px 0 0; padding: 0; position: absolute; top: 100%; left: 0; right: 0; z-index: 60;
  background: var(--color-surface); border: 1.5px solid var(--color-border); border-radius: 10px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.14); max-height: 220px; overflow-y: auto;
}
.suggestion-item { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.55rem 0.85rem; font-size: 0.83rem; color: var(--color-text); cursor: pointer; border-bottom: 1px solid var(--color-border); }
.suggestion-item:last-child { border-bottom: none; }
.suggestion-item:hover { background: color-mix(in srgb, var(--color-accent) 8%, transparent); }
.suggestion-item i { margin-top: 0.15rem; flex-shrink: 0; color: var(--color-accent-dark); }
.search-hint { margin: 4px 0 0; font-size: 0.78rem; color: var(--color-text-muted); }

.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

/* ── Documents ────────────────────────────────────────  */
.doc-list { display: flex; flex-direction: column; gap: 0.6rem; }
.doc-item {
  display: flex; align-items: center; gap: 0.9rem; padding: 0.75rem 1rem;
  border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-hover-bg);
  text-decoration: none; transition: border-color 0.15s, background 0.15s;
}
.doc-item:hover { border-color: var(--color-primary); background: var(--color-hover-bg-alt); }
.doc-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary); font-size: 1.05rem;
}
.doc-info { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; min-width: 0; }
.doc-type { font-size: 0.82rem; font-weight: 700; color: var(--color-heading); }
.doc-filename { font-size: 0.74rem; color: var(--color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doc-delete {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; flex-shrink: 0;
  background: var(--color-danger-bg); border: none; border-radius: 8px; color: var(--color-danger); cursor: pointer;
}
.doc-delete:hover { opacity: 0.8; }

.upload-zone {
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.4rem; padding: 1.5rem 1rem; border: 1.5px dashed var(--color-border); border-radius: 12px; cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.upload-zone:hover { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 6%, transparent); }
.upload-zone--filled { border-style: solid; border-color: color-mix(in srgb, var(--color-accent) 40%, transparent); background: color-mix(in srgb, var(--color-accent) 8%, transparent); }
.upload-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.upload-icon { font-size: 1.5rem; color: var(--color-text-muted); }
.upload-zone--filled .upload-icon { color: var(--color-accent-dark); }
.upload-hint { font-size: 0.8rem; color: var(--color-text-secondary); }
.upload-filename { font-size: 0.82rem; font-weight: 600; color: var(--color-text); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Déconnexion ──────────────────────────────────────  */
.logout-zone { display: flex; justify-content: center; padding-top: 12px; }
.logout-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 24px; border-radius: 999px; border: 1.5px solid var(--color-border);
  background: transparent; color: var(--color-text-secondary);
  font-family: var(--font-nav); font-weight: 600; font-size: 0.85rem; cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.logout-btn:hover:not(:disabled) { border-color: var(--color-danger); color: var(--color-danger); }
.logout-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.logout-progress { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 16px 0; }
.logout-progress-spinner {
  width: 30px; height: 30px; border-radius: 50%;
  border: 3px solid var(--color-border); border-top-color: var(--color-danger);
  animation: companySpin 0.7s linear infinite;
}
.logout-progress-text { font-size: 0.85rem; color: var(--color-text-secondary); margin: 0; }

/* ── Boutons / modals communs ─────────────────────────  */
.btn-primary, .btn-ghost, .btn-danger {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 20px; border-radius: 8px;
  font-family: var(--font-nav); font-weight: 600; font-size: 0.85rem; cursor: pointer; border: 1px solid transparent;
}
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { background: transparent; border-color: var(--color-border); color: var(--color-text); }
.btn-ghost:hover:not(:disabled) { border-color: #cbd5e1; background: var(--color-hover-bg); }
.btn-danger { background: var(--color-danger); color: #fff; }
.btn-danger:hover:not(:disabled) { background: var(--color-danger-dark); }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

.modal-backdrop {
  position: fixed; inset: 0; background: var(--color-backdrop);
  display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px;
}
.modal-box { background: var(--color-surface); border-radius: 16px; padding: 24px; max-width: 440px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2); }
.modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.modal-title { font-family: var(--font-heading); font-weight: 700; font-size: 1rem; color: var(--color-heading); margin: 0; }
.modal-close { background: none; border: none; color: var(--color-text-secondary); cursor: pointer; font-size: 1rem; }
.modal-text { margin: 12px 0 16px; font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.5; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }

@media (max-width: 480px) {
  .fields-grid { grid-template-columns: 1fr; }
}
</style>
