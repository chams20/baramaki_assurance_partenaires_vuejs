import './assets/design-tokens.css'
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

// Attend que la première navigation (et donc l'hydratation de session dans le
// router, voir router/index.js) soit résolue avant de monter — évite un flash
// de contenu "non connecté" pendant que la session est vérifiée, même
// convention que les deux autres dépôts front.
router.isReady().then(() => {
  app.mount('#app')
})
