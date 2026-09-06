import axios from 'axios'
import authStore, { clearSession, setAccessToken } from '@/services/auth/authStore'

/**
 * Client HTTP vers le backend BARAMAKI (baramaki_assurance_back) — même
 * mécanisme JWT + refresh en cookie httpOnly que les deux autres dépôts
 * front (voir leur apiClient.js).
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_APP_BACK_API_URL,
  // Indispensable pour que le navigateur envoie/reçoive le cookie httpOnly du
  // refresh token (voir security.yaml/nelmio_cors.yaml côté back : allow_credentials
  // + origine explicite, pas de wildcard, sinon les cookies cross-origin ne passent pas).
  withCredentials: true,
  headers: {
    // Dit au back "je suis un client web" : le refresh token est alors transporté
    // par cookie httpOnly plutôt que dans le JSON — voir RefreshTokenCookie côté back.
    'X-Client-Type': 'web',
  },
})

// Attache l'access token courant (en mémoire, jamais en storage) à chaque requête.
apiClient.interceptors.request.use((config) => {
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`
  }
  return config
})

// Rafraîchissement silencieux en cas d'access token expiré (401), avec verrou
// pour qu'un lot de requêtes en parallèle ne déclenche qu'un seul refresh.
let refreshPromise = null

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${import.meta.env.VITE_APP_BACK_API_URL}/api/auth/token/refresh`,
        {},
        { withCredentials: true, headers: { 'X-Client-Type': 'web' } },
      )
      .then((response) => {
        setAccessToken(response.data.access_token)
        return response.data.access_token
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error

    // Pas de retry sur le refresh lui-même (évite une boucle infinie), ni sur
    // le login (un 401 au login = mauvais identifiants, pas un token expiré).
    const isAuthRoute =
      config?.url?.includes('/api/auth/token/refresh') || config?.url?.includes('/api/auth/login')

    if (response?.status === 401 && !isAuthRoute && !config._retried) {
      config._retried = true

      try {
        const newAccessToken = await refreshAccessToken()
        config.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(config)
      } catch {
        clearSession()
      }
    }

    return Promise.reject(error)
  },
)

/**
 * Résout un chemin de fichier renvoyé par le back (logo, document...) en URL
 * complète affichable — retour direct 2026-09-06, après avoir constaté
 * qu'une photo/un document envoyé depuis un client ne s'affichait pas
 * forcément chez l'autre : le back ne stocke plus qu'un CHEMIN RELATIF,
 * jamais une URL absolue — c'est à CHAQUE client de préfixer avec sa propre
 * base d'API au moment de l'affichage. `path` déjà absolu (ancien
 * enregistrement, avant ce changement) : renvoyé tel quel, jamais
 * doublement préfixé.
 */
export function resolveAssetUrl(path) {
  if (!path || path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${import.meta.env.VITE_APP_BACK_API_URL}${path}`
}

export default apiClient
