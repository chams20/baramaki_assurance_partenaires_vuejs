import './assets/design-tokens.css'
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Toast pour les messages de réussite et d'échec — même config que
// baramaki_assurance_admin_vuejs (voir son main.js).
import Toast, { POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

const options = {
  position: POSITION.TOP_RIGHT,
  timeout: 4000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
}

const app = createApp(App)

app.use(Toast, options)
app.use(router)

// Attend que la première navigation (et donc l'hydratation de session dans le
// router, voir router/index.js) soit résolue avant de monter — évite un flash
// de contenu "non connecté" pendant que la session est vérifiée, même
// convention que les deux autres dépôts front.
router.isReady().then(() => {
  app.mount('#app')
})
