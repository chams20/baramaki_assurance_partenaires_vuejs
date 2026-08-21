<template>
  <div class="baramaki-error-page">
    <audio ref="dangerSound" src="/song/acces_denied.mp3"></audio>

    <section class="error-card">
      <div class="forbidden-icon">
        <i class="bi bi-shield-exclamation"></i>
      </div>

      <h1 class="error-code">403</h1>
      <h2 class="error-title">Accès refusé</h2>

      <p class="error-message">
        Votre compte n'a pas le rôle Partenaire nécessaire pour accéder à cet espace — vous avez été
        déconnecté. Si vous pensez qu'il s'agit d'une erreur, contactez BARAMAKI.
      </p>

      <div class="error-actions">
        <router-link to="/login" class="btn-outline">
          <i class="bi bi-box-arrow-in-right"></i> Retour à la connexion
        </router-link>
      </div>
    </section>
  </div>
</template>

<script>
// Même son "accès refusé" que forbiddenPage.vue côté admin — même fichier
// (public/song/acces_denied.mp3), même patron de lecture (voir tryPlaySound).
export default {
  name: 'ForbiddenPage',
  mounted() {
    this.tryPlaySound()
  },
  beforeUnmount() {
    document.removeEventListener('click', this.tryPlaySound)
    document.removeEventListener('keydown', this.tryPlaySound)
  },
  methods: {
    tryPlaySound() {
      const audio = this.$refs.dangerSound
      if (!audio) return

      audio.play().catch((err) => {
        // La plupart des navigateurs bloquent l'audio tant qu'aucun geste
        // utilisateur direct n'a eu lieu sur CETTE page (arriver ici via une
        // redirection du router, sans clic, en est le cas typique). On
        // journalise pour comprendre (au lieu d'avaler l'erreur), et on
        // retente au premier clic/touche sur la page.
        console.warn('[ForbiddenPage] lecture audio bloquée par le navigateur, en attente d\'un geste utilisateur :', err)
        document.addEventListener('click', this.tryPlaySound, { once: true })
        document.addEventListener('keydown', this.tryPlaySound, { once: true })
      })
    },
  },
}
</script>

<style scoped>
.baramaki-error-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #7a0f1f 100%);
  font-family: var(--font-body);
}

.error-card {
  width: 100%;
  max-width: 480px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 50px 40px;
  text-align: center;
  color: #fff;
  backdrop-filter: blur(12px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  animation: fadeIn 0.6s ease;
}

.forbidden-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: rgba(223, 21, 41, 0.18);
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.7rem;
  color: #ff6b7a;
  box-shadow: 0 0 30px rgba(223, 21, 41, 0.45);
  animation: pulse 1.8s ease-in-out infinite;
}

.error-code {
  font-family: var(--font-heading);
  font-size: 84px;
  font-weight: 800;
  letter-spacing: -3px;
  margin: 0 0 8px;
  color: #ff6b7a;
  text-shadow:
    0 0 20px rgba(223, 21, 41, 0.65),
    0 0 45px rgba(223, 21, 41, 0.35);
}

.error-title {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 14px;
}

.error-message {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.92rem;
  margin: 0 0 28px;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  justify-content: center;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-nav);
  font-weight: 600;
  font-size: 0.85rem;
  padding: 11px 24px;
  border-radius: 999px;
  cursor: pointer;
  background: transparent;
  color: #ffffff;
  text-decoration: none;
  border: 2px solid rgba(255, 255, 255, 0.45);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn-outline:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.2);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 30px rgba(223, 21, 41, 0.45);
  }
  50% {
    box-shadow: 0 0 42px rgba(223, 21, 41, 0.7);
  }
}
</style>
