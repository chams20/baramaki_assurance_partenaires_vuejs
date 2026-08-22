import axios from 'axios'
import apiClient from '@/api/apiClient'

/**
 * Point d'entrée UNIQUE pour la suggestion d'adresse, quel que soit le pays.
 * Centralisé ici plutôt qu'éclaté dans chaque composant qui en a besoin, pour
 * deux raisons : (1) un seul endroit à faire évoluer le jour où un troisième
 * pays est supporté, (2) ce fichier est volontairement portable — pas de
 * dépendance à un composant Vue précis — pour pouvoir être recopié tel quel
 * sur le front client (baramaki_assurance_vuejs) le jour où le même besoin
 * s'y pose, sans réécrire la logique de routage par pays ni le contrat BAN.
 *
 * Un seul point d'appel pour l'app : suggestAddress({ country, query }).
 * Le reste (BAN pour la France, notre référentiel pour les Comores) reste un
 * détail interne — la sortie est normalisée dans les deux cas, voir
 * normalizeBanFeature()/normalizeComoresResult() plus bas.
 *
 * BAN utilisée via axios brut (pas apiClient) : c'est une API publique
 * externe (api-adresse.data.gouv.fr), pas notre backend — apiClient y
 * attacherait inutilement notre JWT et ses intercepteurs de refresh.
 */

const BAN_URL = 'https://api-adresse.data.gouv.fr/search/'

// Un seul endroit à modifier pour ajouter un pays supporté plus tard.
const COUNTRY_PROVIDERS = {
  France: 'ban',
  Comores: 'comores',
}

export function getSupportedCountries() {
  return Object.keys(COUNTRY_PROVIDERS)
}

export function getProviderForCountry(country) {
  return COUNTRY_PROVIDERS[country] ?? null
}

/**
 * @param {{ country: string, query: string }} params
 * @returns {Promise<Array<object>>} Suggestions normalisées (même forme quel
 * que soit le fournisseur réel) : { provider, label, street, streetNumber,
 * city, postalCode, island, region, village, neighborhood, country,
 * latitude, longitude }. Tableau vide si le pays n'est pas supporté ou la
 * requête trop courte — jamais d'exception remontée au composant appelant
 * pour une frappe en cours.
 */
export async function suggestAddress({ country, query }) {
  const provider = getProviderForCountry(country)
  const q = (query || '').trim()
  if (!provider || q.length < 2) return []

  return provider === 'ban' ? suggestFromBan(q) : suggestFromComores(q)
}

async function suggestFromBan(query) {
  const { data } = await axios.get(BAN_URL, { params: { q: query, limit: 5, type: 'housenumber' } })
  let features = data?.features ?? []

  // Repli sans filtre de type si aucun résultat précis (numéro de rue) —
  // couvre les recherches de rue/ville seules.
  if (!features.length) {
    const fallback = await axios.get(BAN_URL, { params: { q: query, limit: 5 } })
    features = fallback.data?.features ?? []
  }

  return features.map(normalizeBanFeature)
}

async function suggestFromComores(query) {
  const { data } = await apiClient.get('/api/geo/suggest', { params: { q: query } })
  return (data?.results ?? []).map(normalizeComoresResult)
}

// BAN (GeoJSON) : longitude AVANT latitude dans geometry.coordinates.
// properties.street est déjà le nom de rue SEUL (sans le numéro) côté BAN —
// housenumber est un champ à part. Les recombiner en une seule chaîne (comme
// le fait la recette, qui n'a qu'un champ "rue" unique) aurait dupliqué le
// numéro entre `street` et `streetNumber` une fois les deux mappés sur des
// champs de formulaire séparés (Address::$street / Address::$streetNumber).
function normalizeBanFeature(feature) {
  const p = feature.properties ?? {}
  const [lon, lat] = feature.geometry?.coordinates ?? [null, null]

  return {
    provider: 'ban',
    label: p.label ?? p.street ?? '',
    street: p.street ?? p.label?.split(',')[0] ?? '',
    streetNumber: p.housenumber ?? null,
    city: p.city ?? null,
    postalCode: p.postcode ?? null,
    island: null,
    region: null,
    village: null,
    neighborhood: null,
    country: 'France',
    latitude: lat ? parseFloat(lat) : null,
    longitude: lon ? parseFloat(lon) : null,
  }
}

// `result` = un élément de GET /api/geo/suggest — voir GeoSuggestController
// côté back pour la forme exacte (type/name/chain/island/region/commune/
// village/neighborhood/coordinates).
function normalizeComoresResult(result) {
  return {
    provider: 'comores',
    label: `${result.name} — ${result.chain}`,
    street: null,
    streetNumber: null,
    // Notre référentiel n'a pas de notion de "ville" — la commune en tient
    // lieu, c'est le niveau administratif le plus proche.
    city: result.commune ?? null,
    postalCode: null,
    island: result.island ?? null,
    region: result.region ?? null,
    village: result.village ?? null,
    neighborhood: result.neighborhood ?? null,
    country: 'Comores',
    latitude: result.coordinates?.lat ?? null,
    longitude: result.coordinates?.lng ?? null,
  }
}
