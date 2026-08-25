import apiClient from '@/api/apiClient'

/**
 * Auto-service partenaire — voir GeoApiPartnerSelfServiceController côté
 * back (docs/refonte-backend/12-forfaits-partenaires.md §5). Réservé aux
 * comptes ROLE_PARTNER, comme tout cet espace.
 */

/**
 * Fiche partenaire (entreprise) du compte connecté, avec ses abonnements —
 * GET /api/geo/my-client.
 */
export async function getMyClient() {
  const { data } = await apiClient.get('/api/geo/my-client')
  return data.client
}

/**
 * Agences BARAMAKI les plus proches d'une position — GET
 * /api/geo/my-client/agencies/nearby. Coordonnées obtenues via la
 * géolocalisation du navigateur (voir DashboardPage.vue), jamais saisies —
 * "on prend ses coordonnées et on lui montre directement les agences
 * proches" (demande explicite). Retourne au plus 5 agences, triées par
 * distance croissante.
 * @param {number} lat
 * @param {number} lng
 */
export async function getNearbyAgenciesForMe(lat, lng) {
  const { data } = await apiClient.get('/api/geo/my-client/agencies/nearby', { params: { lat, lng } })
  return data.agencies
}

/**
 * Télécharge une de ses propres factures au format PDF — GET
 * /api/geo/my-client/invoices/{invoiceUuid}/pdf. Généré à la volée côté
 * back (dompdf), récupéré en blob puis téléchargé nous-mêmes : la route
 * passe par apiClient donc porte le Bearer token, contrairement à un simple
 * lien <a href>.
 * @param {string} invoiceUuid
 */
export async function downloadMyInvoicePdf(invoiceUuid) {
  const response = await apiClient.get(`/api/geo/my-client/invoices/${invoiceUuid}/pdf`, {
    responseType: 'blob',
  })
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = `facture-baramaki-${invoiceUuid.slice(0, 8)}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}

/**
 * Catalogue des forfaits actifs proposés — GET /api/geo/my-client/plans.
 */
export async function listAvailablePlans() {
  const { data } = await apiClient.get('/api/geo/my-client/plans')
  return data.plans
}

/**
 * Souscrit le partenaire connecté à un prix de forfait — POST
 * /api/geo/my-client/subscriptions. Le prix (et la réduction active à cet
 * instant, le cas échéant) est figé côté back au moment de l'appel.
 * `termsAccepted` doit être `true` (le contrat de souscription — délai de
 * résiliation/remboursement — a été lu et coché, voir ChoosePlanPage.vue) :
 * le back refuse la requête avec 400 sinon.
 * @param {string} planPriceId
 */
export async function subscribeToPlan(planPriceId) {
  const { data } = await apiClient.post('/api/geo/my-client/subscriptions', { planPriceId, termsAccepted: true })
  return data.client
}

/**
 * Change de forfait (upgrade seulement — voir doc 12 §3) — POST
 * /api/geo/my-client/subscriptions/upgrade. Le prorata du temps non utilisé
 * sur l'abonnement actuel est calculé côté back, jamais ici. Même exigence
 * `termsAccepted` que subscribeToPlan() — un changement de forfait crée une
 * nouvelle souscription, donc un nouveau contrat à accepter.
 * @param {string} planPriceId
 */
export async function upgradeSubscription(planPriceId) {
  const { data } = await apiClient.post('/api/geo/my-client/subscriptions/upgrade', { planPriceId, termsAccepted: true })
  return data.client
}

/**
 * Résilie un de ses propres abonnements, à tout moment — PATCH
 * /api/geo/my-client/subscriptions/{uuid}/cancel. Le remboursement n'est
 * jamais automatique (voir doc 15) : `refundEligible` indique seulement si
 * la résiliation tombe dans la fenêtre des 20 jours suivant l'activation,
 * l'admin traite le remboursement à la main derrière.
 * @param {string} subscriptionUuid
 * @returns {Promise<{ client: object, refundEligible: boolean }>}
 */
export async function cancelMySubscription(subscriptionUuid) {
  const { data } = await apiClient.patch(`/api/geo/my-client/subscriptions/${subscriptionUuid}/cancel`)
  return { client: data.client, refundEligible: data.refundEligible }
}

/**
 * Génère une nouvelle clé pour un de ses forfaits — POST
 * /api/geo/my-client/keys. Un abonnement peut financer plusieurs clés, une
 * par domaine (doc 09 §5) — subscriptionId et domain obligatoires. La valeur
 * complète de la clé (`plainKey`) n'est renvoyée qu'ici, une seule fois.
 * @param {{ subscriptionId: string, domain: string }} payload
 * @returns {Promise<{ client: object, plainKey: string }>}
 */
export async function generateMyKey(payload) {
  const { data } = await apiClient.post('/api/geo/my-client/keys', payload)
  return { client: data.client, plainKey: data.plainKey }
}

/**
 * Révoque une de ses propres clés — PATCH
 * /api/geo/my-client/keys/{keyUuid}/revoke.
 * @param {string} keyUuid
 */
export async function revokeMyKey(keyUuid) {
  const { data } = await apiClient.patch(`/api/geo/my-client/keys/${keyUuid}/revoke`)
  return data.client
}

/**
 * Confirme explicitement avoir copié la clé en clair avant qu'elle
 * disparaisse — PATCH /api/geo/my-client/keys/{keyUuid}/mark-copied. Appelé
 * seulement depuis le modal de confirmation, jamais en fermant simplement le
 * panneau de révélation (voir GeoApiKey::$copiedAt, doc 15/16).
 * @param {string} keyUuid
 */
export async function markMyKeyCopied(keyUuid) {
  const { data } = await apiClient.patch(`/api/geo/my-client/keys/${keyUuid}/mark-copied`)
  return data.client
}

/**
 * "Tester ma clé" — POST /api/geo/my-client/keys/{keyUuid}/test. Ne fait PAS
 * un vrai appel HTTP à /api/geo/suggest avec X-Api-Key (l'Origin de ce
 * portail n'est jamais le domaine enregistré sur la clé, ça échouerait
 * systématiquement au contrôle de domaine côté back) — endpoint dédié,
 * protégé par la connexion JWT habituelle, qui appelle directement le même
 * calcul de suggestion. Compte pour de vrai dans le quota mensuel (décidé
 * explicitement, voir docs/refonte-backend/09-api-adressage-partenaires.md
 * §5) : peut renvoyer 429 si le quota du forfait est déjà atteint.
 * @param {string} keyUuid
 * @param {string} q
 * @returns {Promise<{status: string, query: string, results: object[]}>}
 */
export async function testMyKey(keyUuid, q) {
  const { data } = await apiClient.post(`/api/geo/my-client/keys/${keyUuid}/test`, { q })
  return data
}

/**
 * Modifie la fiche entreprise du partenaire connecté — nom, téléphone de
 * l'entreprise, adresse du siège — PATCH /api/geo/my-client.
 * @param {object} payload
 */
export async function updateMyClient(payload) {
  const { data } = await apiClient.patch('/api/geo/my-client', payload)
  return data.client
}

/**
 * Dépose/remplace le logo de l'entreprise — POST /api/geo/my-client/logo.
 * @param {File} file
 */
export async function uploadMyClientLogo(file) {
  const fd = new FormData()
  fd.append('logo', file)
  const { data } = await apiClient.post('/api/geo/my-client/logo', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.client
}

/**
 * Retire le logo de l'entreprise — DELETE /api/geo/my-client/logo.
 */
export async function removeMyClientLogo() {
  const { data } = await apiClient.delete('/api/geo/my-client/logo')
  return data.client
}

/**
 * Ajoute un justificatif d'entreprise (KBIS ou équivalent) — POST
 * /api/geo/my-client/documents (multipart/form-data).
 * @param {{ type: string, file: File }} payload
 */
export async function addMyClientDocument({ type, file }) {
  const fd = new FormData()
  fd.append('type', type)
  fd.append('file', file)
  const { data } = await apiClient.post('/api/geo/my-client/documents', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.client
}

/**
 * Supprime un justificatif d'entreprise — DELETE
 * /api/geo/my-client/documents/{docUuid}.
 * @param {string} docUuid
 */
export async function deleteMyClientDocument(docUuid) {
  const { data } = await apiClient.delete(`/api/geo/my-client/documents/${docUuid}`)
  return data.client
}
