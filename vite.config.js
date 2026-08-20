import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // Port dédié à l'espace partenaires — voir
  // docs/refonte-backend/11-espace-partenaires-vuejs.md côté back pour la
  // décision (projet séparé, port 5175, distinct de l'admin 5174 et du
  // client 5173).
  server: {
    port: 5175,
  },
})
