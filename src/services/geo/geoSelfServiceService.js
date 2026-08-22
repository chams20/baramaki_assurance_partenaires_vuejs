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
 * @param {string} planPriceId
 */
export async function subscribeToPlan(planPriceId) {
  const { data } = await apiClient.post('/api/geo/my-client/subscriptions', { planPriceId })
  return data.client
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
