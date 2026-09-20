import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    // One JS file, no lazily-fetched chunks: after an update, an already-open
    // page can never ask for an old chunk that the new deploy has deleted.
    rollupOptions: { output: { inlineDynamicImports: true } }
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Rower Ghost Race',
        short_name: 'GhostRow',
        description: 'Race your own past rows on the Concept2 PM5',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          // Chrome's install prompt requires real PNG icons (192 + 512) —
          // an SVG-only icon list silently fails the installability check.
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ]
      }
    })
  ]
})
