import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Genera el SW con Workbox durante el build
      strategies: 'generateSW',
      devOptions: {
        // SW activo en desarrollo para poder probar offline
        enabled: false,
      },
      workbox: {
        // App Shell: Cache First (assets estáticos)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Peticiones a la API de Supabase: Network First con fallback 5s
            urlPattern: new RegExp('^https://[^/]+\\.supabase\\.co/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'u24-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
            },
          },
          {
            // Iconos y assets estáticos: Cache First
            urlPattern: /\/assets\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'u24-assets',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name:             'U24 — Control operativo',
        short_name:       'U24',
        description:      'Terminal operativo de misión crítica para Servicios Sanitarios',
        theme_color:      '#111111',
        background_color: '#111111',
        display:          'standalone',
        start_url:        '/',
        scope:            '/',
        lang:             'es',
        icons: [
          { src: '/icon-72.png',  sizes: '72x72',   type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom'],
          'vendor-sentry':  ['@sentry/react'],
          'vendor-supabase':['@supabase/supabase-js'],
          'vendor-zustand': ['zustand'],
          'vendor-idb':     ['idb-keyval'],
        },
      },
    },
  },
})
