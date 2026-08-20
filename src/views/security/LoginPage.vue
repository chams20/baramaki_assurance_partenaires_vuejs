<template>
  <div class="baramaki-auth">
    <div class="auth-card">
      <div class="auth-logo">
        <img src="/img/logo_1024.png" alt="BARAMAKI" />
      </div>

      <h1 class="auth-title">Espace Partenaires</h1>
      <p class="auth-subtitle">Connectez-vous pour accéder à votre clé API et votre consommation</p>

      <div v-if="error" class="auth-alert">{{ error }}</div>

      <!-- Petit écran de succès, affiché 2 secondes avant la redirection —
           même patron que le login admin et le login client. -->
      <div v-if="loginSuccess" class="success-block">
        <div class="success-icon"><i class="bi bi-check-circle-fill"></i></div>
        <p class="success-text">{{ successMessage }}</p>
      </div>

      <form v-else class="auth-form" @submit.prevent="handleSubmit" novalidate>
        <div class="form-field">
          <label for="email">Adresse email</label>
          <input
            id="email"
            v-model.trim="form.email"
            placeholder="Votre adresse email"
            type="email"
            autocomplete="username"
            required
            autofocus
          />
        </div>

        <div class="form-field">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            v-model="form.password"
            placeholder="Votre mot de passe"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>

        <label class="checkbox-label row-check">
          <input v-model="form.rememberMe" type="checkbox" />
          <span>Se souvenir de moi</span>
        </label>

        <button class="auth-submit" type="submit" :disabled="loading">
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>

      <p class="auth-footer-text">
        Pas encore partenaire ?
        <a href="mailto:contact@baramaki.com" class="footer-link">Demander un accès</a>
      </p>
    </div>
  </div>
</template>

<script>
import { login } from '@/services/auth/authService'

export default {
  name: 'LoginPage',
  data() {
    return {
      form: { email: '', password: '', rememberMe: true },
      loading: false,
      error: null,
      loginSuccess: false,
      successMessage: 'Connexion réussie.',
    }
  },
  methods: {
    async handleSubmit() {
      this.error = null
      this.loading = true

      try {
        const user = await login(this.form.email, this.form.password, this.form.rememberMe)
        const name = user?.profile?.firstName || user?.displayNames?.short
        this.successMessage = name ? `Bienvenue, ${name} !` : 'Connexion réussie.'
        this.loginSuccess = true

        const redirect = this.$route.query.redirect || '/tableau-de-bord'
        setTimeout(() => {
          this.$router.push(redirect)
        }, 2000)
      } catch (e) {
        this.error = e.response?.data?.message || 'Connexion impossible. Vérifiez vos identifiants.'
        this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.baramaki-auth {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
  font-family: var(--font-body);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-surface);
  border-radius: 20px;
  padding: 40px 36px;
  box-shadow: 0 20px 60px rgba(4, 6, 119, 0.25);
  text-align: center;
  animation: fadeIn 0.5s ease;
}

.auth-logo {
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(4, 6, 119, 0.25);
}

.auth-logo img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.auth-title {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.6rem;
  color: var(--color-primary);
  margin-bottom: 6px;
}

.auth-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.auth-alert {
  background: var(--color-danger-bg);
  color: var(--color-danger-dark);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.85rem;
  margin-bottom: 18px;
  text-align: left;
}

.auth-form {
  text-align: left;
}

.form-field {
  margin-bottom: 18px;
}

.form-field label {
  display: block;
  font-family: var(--font-nav);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.form-field input {
  width: 100%;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.92rem;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-field input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(26, 204, 141, 0.18);
}

.row-check {
  margin-bottom: 22px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-nav);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
}

.checkbox-label:hover {
  color: var(--color-text);
}

.checkbox-label input[type='checkbox'] {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  position: relative;
  flex-shrink: 0;
  width: 17px;
  height: 17px;
  margin: 0 12px 0 0;
  padding: 0;
  border-radius: 5px;
  border: 1.5px solid #d1d5db;
  background: var(--color-surface);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.checkbox-label:hover input[type='checkbox'] {
  border-color: var(--color-accent);
}

.checkbox-label input[type='checkbox']:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(26, 204, 141, 0.18);
}

.checkbox-label input[type='checkbox']:checked {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: transparent;
}

.checkbox-label input[type='checkbox']::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid var(--color-surface);
  border-width: 0 2px 2px 0;
  opacity: 0;
  transform: rotate(45deg) scale(0.4);
  transform-origin: center;
  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease;
}

.checkbox-label input[type='checkbox']:checked::after {
  opacity: 1;
  transform: rotate(45deg) scale(1);
}

.auth-submit {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: var(--color-surface);
  font-family: var(--font-nav);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  margin-top: 6px;
}

.auth-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(4, 6, 119, 0.3);
}

.auth-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-footer-text {
  margin-top: 22px;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.footer-link {
  color: var(--color-accent);
  font-weight: 600;
  text-decoration: none;
}

.footer-link:hover {
  text-decoration: underline;
}

.success-block {
  padding: 14px 0 4px;
  animation: successAppear 0.35s ease;
}

.success-icon {
  font-size: 3rem;
  color: var(--color-accent);
  margin-bottom: 14px;
}

.success-text {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 4px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes successAppear {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
