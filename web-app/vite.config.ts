import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Prompt user for update
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
      },
      manifest: {
        name: 'Gestão Financeira AC-4 Pro',
        short_name: 'Gestão AC-4 Pro',
        description: 'Aplicativo de controle financeiro',
        theme_color: '#ffffff',
        start_url: '/',
        icons: [] // Logo removido pois o arquivo nao existe
      }
    })
  ],
})
