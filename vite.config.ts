import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Fecha de la versión, visible en Ajustes para comprobar que tienes la última
  define: { __VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
  plugins: [
    react(),
    tailwindcss(),
    // Convierte la web en una app instalable que funciona sin conexión
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // lo registramos nosotros en main.tsx para buscar actualizaciones
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'One Tomato',
        short_name: 'One Tomato',
        description: 'Planificador semanal de comidas para una persona',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        background_color: '#faf6f1',
        theme_color: '#faf6f1',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
})
