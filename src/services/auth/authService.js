import apiClient from '@/api/apiClient'
import authStore, { setSession, setAccessToken, clearSession, markHydrated } from './authStore'

/**
 * Connexion — POST /api/auth/login, même backend et même contrat que les
 * deux autres dépôts front. Le refresh token n'apparaît jamais dans la
 * réponse côté web (posé en cookie httpOnly directement par le back).
 *
 * Le compte doit exister côté back (créé par un admin après acceptation
 * d'une demande de partenariat, voir
 * docs/refonte-backend/11-espace-partenaires-vuejs.md) — pas d'auto-
 * inscription ici, contrairement au site client.
 */
export async function login(email, password, rememberMe = true) {
  const { data } = await apiClient.post('/api/auth/login', { email, password, rememberMe })
  setSession(data.access_token, data.user)
  await fetchMe() // complète le profil (displayNames, avatar, permissions...)
  return authStore.user
}

/**
 * Recharge le profil complet de l'utilisateur connecté (GET /api/auth/me).
 */
export async function fetchMe() {
  const { data } = await apiClient.get('/api/auth/me')
  authStore.user = data.user
  return data.user
}

/**
 * Tentative de restauration de session au démarrage de l'app : le cookie
 * httpOnly (s'il existe et est valide) suffit à obtenir un nouvel access
 * token sans redemander le mot de passe.
 */
export async function tryRestoreSession() {
  try {
    const { data } = await apiClient.post('/api/auth/token/refresh')
    setAccessToken(data.access_token)
    await fetchMe()
  } catch {
    clearSession()
  } finally {
    markHydrated()
  }
}

/**
 * Déconnexion de cet appareil/onglet uniquement.
 */
export async function logout() {
  try {
    await apiClient.post('/api/auth/logout')
  } finally {
    clearSession()
  }
}
