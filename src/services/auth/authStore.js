import { computed, reactive } from 'vue'

/**
 * État d'authentification partagé, en mémoire uniquement (aucun localStorage/
 * sessionStorage) — même choix, pour les mêmes raisons, que les deux autres
 * dépôts front (voir leur authStore.js) :
 *
 * - Le refresh token vit dans un cookie httpOnly posé par le back (voir
 *   baramaki_assurance_back/docs/refonte-backend/01-refresh-tokens.md) —
 *   invisible en JS, donc invisible à un éventuel script XSS.
 * - L'access token (courte durée, 1h) ne vaut pas la peine d'être persisté :
 *   au rechargement de la page, `authService.tryRestoreSession()` en
 *   redemande un via le cookie de refresh (silencieux pour l'utilisateur).
 */
const state = reactive({
  accessToken: null,
  user: null, // { uuid, email, username, roles, permissions, isVerified, isFirstLogin, displayNames, avatar, profile }
  hydrated: false, // true dès qu'on a tenté une restauration de session (réussie ou non)
})

export const isAuthenticated = computed(() => !!state.accessToken && !!state.user)

export function setSession(accessToken, user) {
  state.accessToken = accessToken
  state.user = user
}

export function setAccessToken(accessToken) {
  state.accessToken = accessToken
}

export function clearSession() {
  state.accessToken = null
  state.user = null
}

export function markHydrated() {
  state.hydrated = true
}

export default state
