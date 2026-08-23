<template>
  <div class="partner-shell">
    <header class="partner-header">
      <div class="partner-header-top">
        <div class="dash-brand">
          <img src="/img/logo_1024.png" alt="BARAMAKI" class="dash-brand-logo" />
          <span class="dash-brand-name">BARAMAKI <span class="dash-brand-accent">Partenaires</span></span>
        </div>

        <button type="button" class="partner-logout-btn" title="Déconnexion" @click="showLogoutModal = true">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </div>

      <!-- Grille à colonnes fixes plutôt qu'un flex-wrap : garantit une
           seule ligne, 5 cases égales, jamais de retour à la ligne
           imprévisible selon la largeur exacte de l'écran. -->
      <nav class="partner-nav">
        <router-link to="/tableau-de-bord" class="partner-nav-link" active-class="partner-nav-link--active" title="Tableau de bord">
          <i class="bi bi-speedometer2"></i> <span>Tableau de bord</span>
        </router-link>
        <router-link to="/cles-api" class="partner-nav-link" active-class="partner-nav-link--active" title="Clés API">
          <i class="bi bi-key"></i> <span>Clés API</span>
        </router-link>
        <router-link to="/facturation" class="partner-nav-link" active-class="partner-nav-link--active" title="Facturation">
          <i class="bi bi-receipt"></i> <span>Facturation</span>
        </router-link>
        <router-link to="/forfaits" class="partner-nav-link" active-class="partner-nav-link--active" title="Forfaits">
          <i class="bi bi-tags"></i> <span>Forfaits</span>
        </router-link>
        <router-link to="/mon-entreprise" class="partner-nav-link" active-class="partner-nav-link--active" title="Mon entreprise">
          <i class="bi bi-building"></i> <span>Mon entreprise</span>
        </router-link>
      </nav>
    </header>

    <main class="partner-main">
      <router-view />
    </main>

    <!-- Confirmation déconnexion — même patron que MyCompanyPage.vue -->
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
  </div>
</template>

<script>
import { logout } from '@/services/auth/authService'

export default {
  name: 'PartnerLayout',
  data() {
    return {
      showLogoutModal: false,
      loggingOut: false,
    }
  },
  methods: {
    async confirmLogout() {
      this.loggingOut = true
      // Délai volontaire — le temps d'une "prise de conscience" avant de
      // couper la session, pas un clic qui éjecte instantanément (même
      // patron que MyCompanyPage.vue).
      await new Promise((resolve) => setTimeout(resolve, 2500))
      await logout()
      this.$router.push('/login')
    },
  },
}
</script>

<style scoped>
.partner-shell {
  min-height: 100vh;
  background: var(--color-bg);
}

/* Grille nommée plutôt qu'un flex-wrap : l'ordre visuel (marque à gauche,
   nav au centre, déconnexion à droite) est explicite par zone, pas déduit
   d'un retour à la ligne imprévisible — voir le réagencement en 2 lignes
   pour petit écran plus bas, qui redéfinit juste les zones/colonnes. */
.partner-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas: "brand nav logout";
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

/* Sur grand écran, ".partner-header-top" n'existe pas visuellement comme
   bloc : marque et déconnexion occupent chacune leur propre zone de la
   grille du header (voir grid-template-areas ci-dessus/ci-dessous). */
.partner-header-top {
  display: contents;
}

.dash-brand {
  grid-area: brand;
  display: flex;
  align-items: center;
  gap: 10px;
}

.dash-brand-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.dash-brand-name {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1rem;
  color: var(--color-primary);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.dash-brand-accent {
  color: var(--color-accent-dark);
}

.partner-nav {
  grid-area: nav;
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
}

.partner-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-nav);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
  white-space: nowrap;
}

.partner-nav-link:hover {
  background: var(--color-hover-bg);
  color: var(--color-primary);
}

.partner-nav-link--active {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
}

.partner-logout-btn {
  grid-area: logout;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.95rem;
  transition: border-color 0.15s, color 0.15s;
}

.partner-logout-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.partner-main {
  max-width: 1040px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}

/* Petit écran : 2 lignes explicites (marque+déconnexion, puis nav en
   pleine largeur) — la nav elle-même passe en grille à 5 colonnes fixes,
   jamais de flex-wrap qui casse au milieu selon la largeur exacte. */
@media (max-width: 820px) {
  .partner-header {
    grid-template-columns: 1fr auto;
    grid-template-areas: "brand logout" "nav nav";
    row-gap: 12px;
    padding: 12px 16px;
  }

  .partner-nav {
    grid-area: nav;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
  }

  .partner-nav-link {
    justify-content: center;
    padding: 10px 2px;
    font-size: 1rem;
  }

  /* Icônes seules — plus net qu'un libellé à peine lisible dans une case de
     quelques dizaines de pixels ; le nom complet reste en infobulle. */
  .partner-nav-link span {
    display: none;
  }
}

/* ── Modal déconnexion (même patron que MyCompanyPage.vue) ──  */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-box {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}

.modal-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-heading);
  margin: 0;
}

.modal-text {
  margin: 12px 0 16px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-ghost,
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border-radius: 8px;
  font-family: var(--font-nav);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-ghost {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text);
}

.btn-ghost:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: var(--color-hover-bg);
}

.btn-danger {
  background: var(--color-danger);
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-dark);
}

.logout-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 16px 0;
}

.logout-progress-spinner {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-danger);
  animation: partnerSpin 0.7s linear infinite;
}

.logout-progress-text {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
}

@keyframes partnerSpin {
  to {
    transform: rotate(360deg);
  }
}
</style>
